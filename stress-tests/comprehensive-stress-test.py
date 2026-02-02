#!/usr/bin/env python3

"""
QuizHub Comprehensive Stress Test
Simulates realistic user behavior with random endpoint access patterns
Includes admin operations for quiz/user management
"""

import requests
import json
import time
import random
import string
import concurrent.futures
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import sys
from collections import defaultdict
import threading

# Configuration
GATEWAY_URL = "http://localhost:8888"   # Update as needed
NUM_REGULAR_USERS = 40
NUM_USERS_TO_PROMOTE = 10  # Promote some users to Admin/Teacher
MAX_WORKERS = 15
ACTIONS_PER_USER = 20  # Random actions each user will perform

# Categories
CATEGORIES = [
    "Science", "History", "Geography", "Mathematics", "Technology",
    "Literature", "Sports", "Music", "Art", "General Knowledge"
]

# Metrics
metrics = {
    "register_success": 0,
    "register_fail": 0,
    "login_success": 0,
    "login_fail": 0,
    "create_quiz_success": 0,
    "create_quiz_fail": 0,
    "update_quiz_success": 0,
    "update_quiz_fail": 0,
    "delete_quiz_success": 0,
    "delete_quiz_fail": 0,
    "quiz_fetch_success": 0,
    "quiz_fetch_fail": 0,
    "get_users_success": 0,
    "get_users_fail": 0,
    "submit_result_success": 0,
    "submit_result_fail": 0,
    "leaderboard_success": 0,
    "leaderboard_fail": 0,
    "profile_success": 0,
    "profile_fail": 0,
    "response_times": defaultdict(list),
}
metrics_lock = threading.Lock()

# Data storage
users = []
quizzes = []
quiz_ids = []


def generate_random_string(length=8):
    """Generate random string"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


def log(message, level="INFO"):
    """Thread-safe logging"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    colors = {
        "INFO": "\033[0;36m",
        "SUCCESS": "\033[0;32m",
        "ERROR": "\033[0;31m",
        "WARNING": "\033[1;33m",
    }
    color = colors.get(level, "")
    reset = "\033[0m"
    print(f"{color}[{timestamp}] [{level}]{reset} {message}")


def update_metric(metric_name, value=1):
    """Thread-safe metric update"""
    with metrics_lock:
        if metric_name in metrics:
            if isinstance(metrics[metric_name], int):
                metrics[metric_name] += value


def record_response_time(operation, duration):
    """Record response time for an operation"""
    with metrics_lock:
        metrics["response_times"][operation].append(duration)


def add_quiz_id(quiz_id):
    """Thread-safe quiz ID storage"""
    with metrics_lock:
        if quiz_id and quiz_id not in quiz_ids:
            quiz_ids.append(quiz_id)


def promote_to_admin(token: str, user_id: str) -> bool:
    """Promote a user to Admin role"""
    start_time = time.time()
    try:
        response = requests.put(
            f"{GATEWAY_URL}/api/users/{user_id}/promote",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("promote", duration)
        
        if response.status_code == 200:
            return True
        else:
            return False
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("promote", duration)
        return False


def register_user(role: str = "User") -> Tuple[bool, Dict]:
    """Register a new user with specified role"""
    username = f"stress_{role.lower()}_{generate_random_string()}"
    email = f"{username}@stress-test.com"
    password = "StressTest123Pass!"
    
    # UserService expects multipart/form-data
    payload = {
        "username": (None, username),
        "email": (None, email),
        "password": (None, password),
        "firstName": (None, f"Stress{role}"),
        "lastName": (None, "Test"),
        "role": (None, role)
    }
    
    start_time = time.time()
    try:
        response = requests.post(
            f"{GATEWAY_URL}/api/users/register",
            files=payload,
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("register", duration)
        
        if response.status_code in [200, 201]:
            data = response.json()
            token = data.get("token") or data.get("Token")
            user_info = data.get("user") or data.get("User")
            user_id = user_info.get("id") if user_info else None
            actual_role = user_info.get("role") if user_info else "User"
            
            user_data = {
                "username": username,
                "email": email,
                "password": password,
                "token": token,
                "id": user_id,
                "role": actual_role
            }
            update_metric("register_success")
            return True, user_data
        else:
            update_metric("register_fail")
            return False, {}
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("register", duration)
        update_metric("register_fail")
        return False, {}


def login_user(username: str, password: str) -> Tuple[bool, str]:
    """Login a user and return token"""
    payload = {
        "usernameOrEmail": username,
        "password": password
    }
    
    start_time = time.time()
    try:
        response = requests.post(
            f"{GATEWAY_URL}/api/users/login",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("login", duration)
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("Token")
            update_metric("login_success")
            return True, token
        else:
            update_metric("login_fail")
            return False, ""
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("login", duration)
        update_metric("login_fail")
        return False, ""


def create_quiz(token: str) -> Optional[str]:
    """Create a quiz (Admin/Teacher only)"""
    category = random.choice(CATEGORIES)
    difficulty = random.randint(1, 3)
    num_questions = random.randint(3, 7)
    
    questions = []
    for i in range(num_questions):
        answers = [
            {"text": f"Correct Answer {i+1}", "isCorrect": True},
            {"text": f"Wrong Answer {i+1}-A", "isCorrect": False},
            {"text": f"Wrong Answer {i+1}-B", "isCorrect": False},
            {"text": f"Wrong Answer {i+1}-C", "isCorrect": False}
        ]
        random.shuffle(answers)
        
        question = {
            "text": f"Question {i+1} about {category}?",
            "questionType": 0,
            "answers": answers
        }
        questions.append(question)
    
    payload = {
        "title": f"Stress Quiz - {category} {generate_random_string(4)}",
        "description": f"Automated test quiz for {category}",
        "category": category,
        "difficulty": difficulty,
        "timeLimitSeconds": 600,
        "questions": questions
    }
    
    start_time = time.time()
    try:
        response = requests.post(
            f"{GATEWAY_URL}/api/quizzes",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("create_quiz", duration)
        
        if response.status_code in [200, 201]:
            quiz_data = response.json()
            quiz_id = quiz_data.get("id")
            add_quiz_id(quiz_id)
            update_metric("create_quiz_success")
            return quiz_id
        else:
            update_metric("create_quiz_fail")
            return None
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("create_quiz", duration)
        update_metric("create_quiz_fail")
        return None


def get_quizzes(token: Optional[str] = None, page: int = 1) -> bool:
    """Get list of quizzes"""
    start_time = time.time()
    try:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        response = requests.get(
            f"{GATEWAY_URL}/api/quizzes?page={page}&pageSize=10",
            headers=headers,
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("get_quizzes", duration)
        
        if response.status_code == 200:
            update_metric("quiz_fetch_success")
            return True
        else:
            update_metric("quiz_fetch_fail")
            return False
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("get_quizzes", duration)
        update_metric("quiz_fetch_fail")
        return False


def get_quiz_by_id(quiz_id: str, token: Optional[str] = None) -> bool:
    """Get specific quiz"""
    start_time = time.time()
    try:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        response = requests.get(
            f"{GATEWAY_URL}/api/quizzes/{quiz_id}",
            headers=headers,
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("get_quiz", duration)
        
        if response.status_code == 200:
            update_metric("quiz_fetch_success")
            return True
        else:
            update_metric("quiz_fetch_fail")
            return False
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("get_quiz", duration)
        update_metric("quiz_fetch_fail")
        return False


def get_quiz_with_questions(quiz_id: str, token: str) -> Optional[Dict]:
    """Get quiz with questions"""
    start_time = time.time()
    try:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        response = requests.get(
            f"{GATEWAY_URL}/api/quizzes/{quiz_id}/with-questions",
            headers=headers,
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("get_quiz", duration)
        
        if response.status_code == 200:
            update_metric("quiz_fetch_success")
            return response.json()
        else:
            update_metric("quiz_fetch_fail")
            return None
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("get_quiz", duration)
        update_metric("quiz_fetch_fail")
        return None


def get_quiz_by_category(category: str, token: Optional[str] = None) -> bool:
    """Get quizzes by category"""
    start_time = time.time()
    try:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        response = requests.get(
            f"{GATEWAY_URL}/api/quizzes/category/{category}?page=1&pageSize=10",
            headers=headers,
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("get_quizzes", duration)
        
        if response.status_code == 200:
            update_metric("quiz_fetch_success")
            return True
        else:
            update_metric("quiz_fetch_fail")
            return False
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("get_quizzes", duration)
        update_metric("quiz_fetch_fail")
        return False


def submit_quiz_result(token: str, quiz_id: str, quiz_data: Dict) -> bool:
    """Submit quiz result"""
    questions = quiz_data.get("questions", [])
    if not questions:
        return False
    
    answers = []
    correct_count = 0
    for question in questions:
        question_id = question.get("id")
        question_answers = question.get("answers", [])
        
        # 70% chance of correct answer
        if random.random() < 0.70 and question_answers:
            correct_answer = next((a["text"] for a in question_answers if a.get("isCorrect")), None)
            if correct_answer:
                given_answer = correct_answer
                correct_count += 1
            else:
                given_answer = random.choice(question_answers)["text"] if question_answers else "Wrong"
        else:
            wrong_answers = [a["text"] for a in question_answers if not a.get("isCorrect")]
            given_answer = random.choice(wrong_answers) if wrong_answers else "Wrong"
        
        answers.append({
            "questionId": question_id,
            "givenAnswer": given_answer
        })
    
    # Calculate score
    score = (correct_count / len(questions)) * 100 if questions else 0
    time_taken = random.randint(60, min(600, len(questions) * 60))
    
    payload = {
        "quizId": quiz_id,
        "score": float(score),
        "timeTakenSeconds": time_taken,
        "answers": answers
    }
    
    start_time = time.time()
    try:
        response = requests.post(
            f"{GATEWAY_URL}/api/results",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("submit_result", duration)
        
        if response.status_code in [200, 201]:
            update_metric("submit_result_success")
            return True
        else:
            update_metric("submit_result_fail")
            return False
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("submit_result", duration)
        update_metric("submit_result_fail")
        return False


def access_leaderboard(category: Optional[str] = None, quiz_id: Optional[str] = None) -> bool:
    """Access leaderboard"""
    start_time = time.time()
    try:
        if quiz_id:
            url = f"{GATEWAY_URL}/api/results/leaderboard/quiz/{quiz_id}?top=10"
        elif category:
            url = f"{GATEWAY_URL}/api/results/leaderboard/category/{category}?top=10"
        else:
            url = f"{GATEWAY_URL}/api/results/leaderboard/global?top=10"
        
        response = requests.get(url, timeout=30)
        duration = time.time() - start_time
        record_response_time("leaderboard", duration)
        
        if response.status_code == 200:
            update_metric("leaderboard_success")
            return True
        else:
            update_metric("leaderboard_fail")
            return False
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("leaderboard", duration)
        update_metric("leaderboard_fail")
        return False


def get_user_profile(token: str) -> bool:
    """Get current user profile"""
    start_time = time.time()
    try:
        response = requests.get(
            f"{GATEWAY_URL}/api/users/auth/currentUser",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("profile", duration)
        
        if response.status_code == 200:
            update_metric("profile_success")
            return True
        else:
            update_metric("profile_fail")
            return False
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("profile", duration)
        update_metric("profile_fail")
        return False


def get_user_stats(user_id: str, token: str) -> bool:
    """Get user statistics"""
    start_time = time.time()
    try:
        response = requests.get(
            f"{GATEWAY_URL}/api/results/stats/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("profile", duration)
        
        if response.status_code == 200:
            update_metric("profile_success")
            return True
        else:
            update_metric("profile_fail")
            return False
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("profile", duration)
        update_metric("profile_fail")
        return False


def get_all_users(token: str) -> bool:
    """Get all users (Admin only)"""
    start_time = time.time()
    try:
        response = requests.get(
            f"{GATEWAY_URL}/api/users/",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("get_users", duration)
        
        if response.status_code == 200:
            update_metric("get_users_success")
            return True
        else:
            update_metric("get_users_fail")
            return False
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("get_users", duration)
        update_metric("get_users_fail")
        return False


def update_quiz(token: str, quiz_id: str) -> bool:
    """Update a quiz (Admin/Teacher only)"""
    payload = {
        "title": f"Updated Quiz {generate_random_string(4)}",
        "description": "Updated description",
        "difficulty": random.randint(1, 3)
    }
    
    start_time = time.time()
    try:
        response = requests.put(
            f"{GATEWAY_URL}/api/quizzes/{quiz_id}",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("update_quiz", duration)
        
        if response.status_code == 200:
            update_metric("update_quiz_success")
            return True
        else:
            update_metric("update_quiz_fail")
            return False
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("update_quiz", duration)
        update_metric("update_quiz_fail")
        return False


def delete_quiz(token: str, quiz_id: str) -> bool:
    """Delete a quiz (Admin/Teacher only)"""
    start_time = time.time()
    try:
        response = requests.delete(
            f"{GATEWAY_URL}/api/quizzes/{quiz_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("delete_quiz", duration)
        
        if response.status_code in [200, 204]:
            update_metric("delete_quiz_success")
            return True
        else:
            update_metric("delete_quiz_fail")
            return False
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("delete_quiz", duration)
        update_metric("delete_quiz_fail")
        return False


def user_simulation(user_data: Dict):
    """Simulate a user's random activity"""
    username = user_data.get("username")
    password = user_data.get("password")
    role = user_data.get("role", "User")
    user_id = user_data.get("id")
    
    # Login to refresh token
    success, token = login_user(username, password)
    if not success:
        return
    
    # Define available actions based on role
    regular_actions = [
        ("browse_quizzes", lambda: get_quizzes(token, random.randint(1, 3))),
        ("browse_category", lambda: get_quiz_by_category(random.choice(CATEGORIES), token)),
        ("view_quiz", lambda: get_quiz_by_id(random.choice(quiz_ids), token) if quiz_ids else False),
        ("view_profile", lambda: get_user_profile(token)),
        ("view_stats", lambda: get_user_stats(user_id, token) if user_id else False),
        ("global_leaderboard", lambda: access_leaderboard()),
        ("category_leaderboard", lambda: access_leaderboard(category=random.choice(CATEGORIES))),
        ("quiz_leaderboard", lambda: access_leaderboard(quiz_id=random.choice(quiz_ids)) if quiz_ids else False),
    ]
    
    # Add quiz submission action
    def take_quiz():
        if not quiz_ids:
            return False
        quiz_id = random.choice(quiz_ids)
        quiz_data = get_quiz_with_questions(quiz_id, token)
        if quiz_data:
            return submit_quiz_result(token, quiz_id, quiz_data)
        return False
    
    regular_actions.append(("take_quiz", take_quiz))
    
    admin_actions = [
        ("create_quiz", lambda: create_quiz(token) is not None),
        ("get_all_users", lambda: get_all_users(token)),
        ("update_quiz", lambda: update_quiz(token, random.choice(quiz_ids)) if quiz_ids else False),
    ]
    
    # Select actions based on role
    if role in ["Admin", "Teacher"]:
        available_actions = regular_actions + admin_actions
    else:
        available_actions = regular_actions
    
    # Perform random actions
    for _ in range(ACTIONS_PER_USER):
        action_name, action_func = random.choice(available_actions)
        try:
            action_func()
            time.sleep(random.uniform(0.05, 0.2))  # Random delay between actions
        except Exception as e:
            pass


def cleanup_test_data():
    """Clean up all test data created during the stress test"""
    log("\n🧹 Phase 5: Cleaning up test data...", "INFO")
    
    cleanup_stats = {
        "quizzes_deleted": 0,
        "quizzes_failed": 0,
        "users_deleted": 0,
        "users_failed": 0
    }
    
    # Delete quizzes created during test
    if quiz_ids:
        log(f"Deleting {len(quiz_ids)} quizzes...", "INFO")
        admin_users = [u for u in users if u.get("role") == "Admin"]
        
        if admin_users:
            admin_token = admin_users[0]["token"]
            for quiz_id in quiz_ids:
                try:
                    response = requests.delete(
                        f"{GATEWAY_URL}/api/quizzes/{quiz_id}",
                        headers={"Authorization": f"Bearer {admin_token}"},
                        timeout=5
                    )
                    if response.status_code in [200, 204]:
                        cleanup_stats["quizzes_deleted"] += 1
                    else:
                        cleanup_stats["quizzes_failed"] += 1
                except Exception:
                    cleanup_stats["quizzes_failed"] += 1
                time.sleep(0.1)
    
    # Delete test users (Note: This requires admin endpoint or cascade delete)
    # For now, we'll just log that users should be cleaned up manually or via database
    log(f"Note: {len(users)} test users created (cleanup via database if needed)", "WARNING")
    
    log(f"✓ Cleanup complete: Deleted {cleanup_stats['quizzes_deleted']} quizzes " +
        f"({cleanup_stats['quizzes_failed']} failed)", "SUCCESS")
    
    return cleanup_stats


def print_metrics():
    """Print final metrics"""
    print("\n" + "="*75)
    print("                  COMPREHENSIVE STRESS TEST RESULTS")
    print("="*75)
    
    print("\n📊 Operation Metrics:")
    print(f"  Registration:    ✓ {metrics['register_success']:4d}  ✗ {metrics['register_fail']:4d}")
    print(f"  Login:           ✓ {metrics['login_success']:4d}  ✗ {metrics['login_fail']:4d}")
    print(f"  Create Quiz:     ✓ {metrics['create_quiz_success']:4d}  ✗ {metrics['create_quiz_fail']:4d}")
    print(f"  Update Quiz:     ✓ {metrics['update_quiz_success']:4d}  ✗ {metrics['update_quiz_fail']:4d}")
    print(f"  Delete Quiz:     ✓ {metrics['delete_quiz_success']:4d}  ✗ {metrics['delete_quiz_fail']:4d}")
    print(f"  Quiz Fetch:      ✓ {metrics['quiz_fetch_success']:4d}  ✗ {metrics['quiz_fetch_fail']:4d}")
    print(f"  Submit Result:   ✓ {metrics['submit_result_success']:4d}  ✗ {metrics['submit_result_fail']:4d}")
    print(f"  Leaderboard:     ✓ {metrics['leaderboard_success']:4d}  ✗ {metrics['leaderboard_fail']:4d}")
    print(f"  Profile/Stats:   ✓ {metrics['profile_success']:4d}  ✗ {metrics['profile_fail']:4d}")
    print(f"  Get Users:       ✓ {metrics['get_users_success']:4d}  ✗ {metrics['get_users_fail']:4d}")
    
    print("\n⏱️  Response Times:")
    for operation, times in sorted(metrics["response_times"].items()):
        if times:
            avg_time = sum(times) / len(times)
            min_time = min(times)
            max_time = max(times)
            p95_time = sorted(times)[int(len(times) * 0.95)] if len(times) > 1 else max_time
            print(f"  {operation:15s}: avg={avg_time:6.3f}s  min={min_time:.3f}s  max={max_time:.3f}s  p95={p95_time:.3f}s")
    
    total_success = sum(v for k, v in metrics.items() if k.endswith('_success'))
    total_fail = sum(v for k, v in metrics.items() if k.endswith('_fail'))
    total = total_success + total_fail
    
    if total > 0:
        success_rate = (total_success / total) * 100
        print(f"\n✅ Overall Success Rate: {success_rate:.2f}%")
    
    print(f"📈 Total Requests: {total}")
    print(f"📝 Quizzes Created: {len(quiz_ids)}")
    
    print("\n" + "="*75)


def main():
    """Main stress test execution"""
    print("\n╔═══════════════════════════════════════════════════════════════════╗")
    print("║     QuizHub Comprehensive Stress Test - Random Patterns          ║")
    print("╚═══════════════════════════════════════════════════════════════════╝\n")
    
    print(f"Configuration:")
    print(f"  Gateway URL: {GATEWAY_URL}")
    print(f"  Regular Users: {NUM_REGULAR_USERS}")
    print(f"  Users to Promote: {NUM_USERS_TO_PROMOTE}")
    print(f"  Actions per user: {ACTIONS_PER_USER}")
    print(f"  Max concurrent workers: {MAX_WORKERS}\n")
    
    start_time = time.time()
    
    # Phase 1: Register users
    log(f"Phase 1: Registering {NUM_REGULAR_USERS} users...", "INFO")
    
    registration_tasks = []
    for _ in range(NUM_REGULAR_USERS):
        registration_tasks.append(("User", register_user))
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(func, role) for role, func in registration_tasks]
        for future in concurrent.futures.as_completed(futures):
            success, user_data = future.result()
            if success:
                users.append(user_data)
    
    log(f"✓ Registered {len(users)} users", "SUCCESS")
    
    if not users:
        log("No users registered successfully. Exiting.", "ERROR")
        return
    
    # Phase 2: Get existing quizzes (skip quiz creation - requires pre-existing admin)
    log(f"\nPhase 2: Promoting {NUM_USERS_TO_PROMOTE} users to Admin...", "INFO")
    
    # Promote some users to Admin using their own tokens (endpoint allows self-promotion)
    promoted_count = 0
    for user in users[:NUM_USERS_TO_PROMOTE]:
        if promote_to_admin(user["token"], user["id"]):
            user["role"] = "Admin"
            promoted_count += 1
    
    log(f"✓ Promoted {promoted_count} users to Admin", "SUCCESS")
    
    # Phase 3: Admins create initial quizzes
    log(f"\nPhase 3: Creating initial quizzes...", "INFO")
    admin_users = [u for u in users if u.get("role") == "Admin"]
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(create_quiz, user["token"]) for user in admin_users for _ in range(3)]
        concurrent.futures.wait(futures)
    
    log(f"✓ Created {len(quiz_ids)} quizzes", "SUCCESS")
    
    # Phase 4: Simulate realistic user activity with random patterns
    log(f"\nPhase 4: Simulating random user activity ({ACTIONS_PER_USER} actions each)...", "INFO")
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(user_simulation, user) for user in users]
        concurrent.futures.wait(futures)
    
    log(f"✓ Completed user activity simulation", "SUCCESS")
    
    elapsed_time = time.time() - start_time
    
    # Phase 5: Cleanup
    cleanup_test_data()
    
    # Print results
    print_metrics()
    print(f"\n⏰ Total execution time: {elapsed_time:.2f} seconds")
    
    total_requests = sum(v for k, v in metrics.items() if k.endswith('_success'))
    if elapsed_time > 0:
        rps = total_requests / elapsed_time
        print(f"⚡ Requests per second: {rps:.2f}")
    
    print(f"\n✅ Comprehensive stress test completed!\n")
    print("🔍 Check your observability stack:")
    print("  • Jaeger:  kubectl port-forward -n observability svc/jaeger-query 16686:16686")
    print("  • Kibana:  kubectl port-forward -n observability svc/kibana 5601:5601")
    print("  • Grafana: kubectl port-forward -n observability svc/grafana 3000:80\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        print_metrics()
        sys.exit(0)
    except Exception as e:
        log(f"Unexpected error: {str(e)}", "ERROR")
        import traceback
        traceback.print_exc()
        print_metrics()
        sys.exit(1)
