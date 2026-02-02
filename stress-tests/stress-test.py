#!/usr/bin/env python3

"""
QuizHub Stress Test - Python Version with Rich Output
Concurrent load testing with detailed metrics and real-time dashboard
"""

import requests
import json
import time
import random
import string
import concurrent.futures
from datetime import datetime
from typing import List, Dict, Tuple
import sys
from collections import defaultdict
import threading

# Configuration
# Azure/Cloud URL: http://quizhub.172.189.52.147.nip.io
GATEWAY_URL = "http://localhost:8080"
NUM_USERS = 1000
NUM_QUIZZES = 200
NUM_SUBMISSIONS_PER_USER = 30
MAX_WORKERS = 100

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
    "quiz_create_success": 0,
    "quiz_create_fail": 0,
    "quiz_fetch_success": 0,
    "quiz_fetch_fail": 0,
    "result_submit_success": 0,
    "result_submit_fail": 0,
    "leaderboard_success": 0,
    "leaderboard_fail": 0,
    "response_times": defaultdict(list),
}
metrics_lock = threading.Lock()

# Data storage
users = []
quizzes = []


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
            elif isinstance(metrics[metric_name], dict):
                # For response times
                pass


def record_response_time(operation, duration):
    """Record response time for an operation"""
    with metrics_lock:
        metrics["response_times"][operation].append(duration)


def register_user() -> Tuple[bool, Dict]:
    """Register a new user"""
    username = f"stress_{generate_random_string()}"
    email = f"{username}@stress-test.com"
    password = "StressTest123Pass"
    
    # Use files parameter to force multipart/form-data
    payload = {
        "username": (None, username),
        "email": (None, email),
        "password": (None, password),
        "firstName": (None, "Stress"),
        "lastName": (None, "Test")
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
            user_id = data.get("user", {}).get("id") or data.get("User", {}).get("id")
            
            user_data = {
                "username": username,
                "email": email,
                "password": password,
                "token": token,
                "id": user_id
            }
            update_metric("register_success")
            return True, user_data
        else:
            log(f"Register failed: {response.status_code} - {response.text[:200]}", "ERROR")
            update_metric("register_fail")
            return False, {}
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("register", duration)
        update_metric("register_fail")
        log(f"Register error: {str(e)}", "ERROR")
        return False, {}


def login_user(username: str, password: str) -> Tuple[bool, Dict]:
    """Login existing user"""
    payload = {
        "usernameOrEmail": f"{username}@quizhub.com" if '@' not in username else username,
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
            user_id = data.get("user", {}).get("id") or data.get("User", {}).get("id")
            
            user_data = {
                "username": username,
                "token": token,
                "id": user_id
            }
            update_metric("login_success")
            return True, user_data
        else:
            log(f"Login failed: {response.status_code} - {response.text[:200]}", "ERROR")
            update_metric("login_fail")
            return False, {}
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("login", duration)
        update_metric("login_fail")
        log(f"Login error: {str(e)}", "ERROR")
        return False, {}


def promote_to_admin(user_id: str, token: str) -> bool:
    """Promote a user to admin"""
    try:
        response = requests.put(
            f"{GATEWAY_URL}/api/users/{user_id}/promote",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        
        if response.status_code == 200:
            log(f"✓ User promoted to Admin", "SUCCESS")
            return True
        else:
            log(f"Promote failed: {response.status_code} - {response.text[:200]}", "ERROR")
            return False
    except Exception as e:
        log(f"Promote error: {str(e)}", "ERROR")
        return False


def register_admin_user() -> Tuple[bool, Dict]:
    """Register a user and promote to admin, or login if exists"""
    username = "admin"
    email = "admin@quizhub.com"
    password = "Admin123Pass!"
    
    # First try to login in case admin already exists
    login_success, user_data = login_user(email, password)
    if login_success:
        log(f"✓ Logged in as existing admin: {username}", "SUCCESS")
        user_data["isAdmin"] = True
        return True, user_data
    
    # If login failed, try to register
    # Use files parameter to force multipart/form-data
    payload = {
        "username": (None, username),
        "email": (None, email),
        "password": (None, password),
        "firstName": (None, "Admin"),
        "lastName": (None, "User")
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
            user_id = data.get("user", {}).get("id") or data.get("User", {}).get("id")
            
            # Promote to admin
            promoted = promote_to_admin(user_id, token)

            # Re-login to get new token with Admin role
            if promoted:
                login_success, login_data = login_user(email, password)
                if login_success:
                    token = login_data.get("token")
                    log(f"✓ Re-logged in to get admin token", "SUCCESS")

            user_data = {
                "username": username,
                "email": email,
                "password": password,
                "token": token,
                "id": user_id,
                "isAdmin": promoted
            }
            update_metric("register_success")
            log(f"✓ Admin user registered: {username}", "SUCCESS")
            return True, user_data
        else:
            log(f"Admin register failed: {response.status_code} - {response.text[:200]}", "ERROR")
            update_metric("register_fail")
            return False, {}
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("register", duration)
        update_metric("register_fail")
        log(f"Admin register error: {str(e)}", "ERROR")
        return False, {}


def create_quiz(token: str) -> Tuple[bool, Dict]:
    """Create a quiz"""
    category = random.choice(CATEGORIES)
    difficulty = random.randint(1, 3)
    num_questions = random.randint(5, 10)
    
    questions = []
    for i in range(num_questions):
        answers = [
            {"text": "Correct Answer", "isCorrect": True},
            {"text": "Wrong Answer 1", "isCorrect": False},
            {"text": "Wrong Answer 2", "isCorrect": False},
            {"text": "Wrong Answer 3", "isCorrect": False}
        ]
        
        question = {
            "text": f"Question {i+1} about {category}?",
            "questionType": 0,
            "answers": answers
        }
        questions.append(question)
    
    payload = {
        "title": f"Stress Test Quiz - {category} {generate_random_string(4)}",
        "description": f"Automated stress test quiz for {category}",
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
            update_metric("quiz_create_success")
            return True, quiz_data
        else:
            log(f"Create quiz failed: {response.status_code} - {response.text[:200]}", "ERROR")
            update_metric("quiz_create_fail")
            return False, {}
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("create_quiz", duration)
        update_metric("quiz_create_fail")
        log(f"Create quiz error: {str(e)}", "ERROR")
        return False, {}


def get_quiz_with_questions(quiz_id: str, token: str) -> Tuple[bool, Dict]:
    """Get quiz with questions"""
    start_time = time.time()
    try:
        response = requests.get(
            f"{GATEWAY_URL}/api/quizzes/{quiz_id}/with-questions",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        duration = time.time() - start_time
        record_response_time("get_quiz", duration)
        
        if response.status_code == 200:
            update_metric("quiz_fetch_success")
            return True, response.json()
        else:
            update_metric("quiz_fetch_fail")
            return False, {}
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("get_quiz", duration)
        update_metric("quiz_fetch_fail")
        return False, {}


def submit_result(token: str, quiz_id: str, quiz_data: Dict) -> bool:
    """Submit quiz result"""
    questions = quiz_data.get("questions", [])
    
    # Generate answers
    answers = []
    for question in questions:
        question_id = question.get("id")
        question_answers = question.get("answers", [])
        
        # 75% chance of correct answer
        if random.random() < 0.75 and question_answers:
            correct_answer = next((a["text"] for a in question_answers if a.get("isCorrect")), None)
            given_answer = correct_answer if correct_answer else "Wrong"
        else:
            given_answer = "Wrong Answer"
        
        answers.append({
            "questionId": question_id,
            "givenAnswer": given_answer
        })
    
    # Calculate score
    score = random.randint(60, 100)
    time_taken = random.randint(60, 360)
    
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
            update_metric("result_submit_success")
            return True
        else:
            update_metric("result_submit_fail")
            return False
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("submit_result", duration)
        update_metric("result_submit_fail")
        return False


def access_leaderboard(category: str = None, token: str = None) -> bool:
    """Access leaderboard"""
    start_time = time.time()
    try:
        if category:
            url = f"{GATEWAY_URL}/api/results/leaderboard/category/{category}?top=10"
        else:
            url = f"{GATEWAY_URL}/api/results/leaderboard/global?top=10"

        headers = {"Authorization": f"Bearer {token}"} if token else {}
        response = requests.get(url, headers=headers, timeout=30)
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


def user_simulation(user_data: Dict, quizzes_list: List[Dict]):
    """Simulate a single user's activity"""
    token = user_data.get("token")
    username = user_data.get("username")
    
    for i in range(NUM_SUBMISSIONS_PER_USER):
        if not quizzes_list:
            break
        
        # Select random quiz
        quiz = random.choice(quizzes_list)
        quiz_id = quiz.get("id")
        
        # Get quiz with questions
        success, quiz_data = get_quiz_with_questions(quiz_id, token)
        if success:
            # Submit result
            submit_result(token, quiz_id, quiz_data)
        
        # Small delay between submissions
        time.sleep(0.1)


def print_metrics():
    """Print final metrics"""
    print("\n" + "="*70)
    print("                    STRESS TEST RESULTS")
    print("="*70)
    
    print("\n📊 Operation Metrics:")
    print(f"  Registration:    ✓ {metrics['register_success']:4d}  ✗ {metrics['register_fail']:4d}")
    print(f"  Quiz Creation:   ✓ {metrics['quiz_create_success']:4d}  ✗ {metrics['quiz_create_fail']:4d}")
    print(f"  Quiz Fetch:      ✓ {metrics['quiz_fetch_success']:4d}  ✗ {metrics['quiz_fetch_fail']:4d}")
    print(f"  Result Submit:   ✓ {metrics['result_submit_success']:4d}  ✗ {metrics['result_submit_fail']:4d}")
    print(f"  Leaderboard:     ✓ {metrics['leaderboard_success']:4d}  ✗ {metrics['leaderboard_fail']:4d}")
    
    print("\n⏱️  Response Times (avg):")
    for operation, times in metrics["response_times"].items():
        if times:
            avg_time = sum(times) / len(times)
            min_time = min(times)
            max_time = max(times)
            print(f"  {operation:15s}: {avg_time:6.3f}s  (min: {min_time:.3f}s, max: {max_time:.3f}s)")
    
    total_success = (metrics['register_success'] + metrics['quiz_create_success'] + 
                    metrics['quiz_fetch_success'] + metrics['result_submit_success'] + 
                    metrics['leaderboard_success'])
    total_fail = (metrics['register_fail'] + metrics['quiz_create_fail'] + 
                 metrics['quiz_fetch_fail'] + metrics['result_submit_fail'] + 
                 metrics['leaderboard_fail'])
    total = total_success + total_fail
    
    if total > 0:
        success_rate = (total_success / total) * 100
        print(f"\n✅ Overall Success Rate: {success_rate:.2f}%")
    
    print("\n" + "="*70)


def main():
    """Main stress test execution"""
    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║        QuizHub Stress Test - Python (Concurrent)            ║")
    print("╚══════════════════════════════════════════════════════════════╝\n")
    
    print(f"Configuration:")
    print(f"  Gateway URL: {GATEWAY_URL}")
    print(f"  Users: {NUM_USERS}")
    print(f"  Quizzes: {NUM_QUIZZES}")
    print(f"  Submissions per user: {NUM_SUBMISSIONS_PER_USER}")
    print(f"  Max concurrent workers: {MAX_WORKERS}\n")
    
    start_time = time.time()
    
    # Phase 0: Register admin user
    log("Phase 0: Registering admin user...", "INFO")
    admin_success, admin_user = register_admin_user()
    if admin_success:
        users.append(admin_user)
    else:
        log("Failed to register admin user. Continuing anyway...", "WARNING")
    
    # Phase 1: Register users
    log(f"\nPhase 1: Registering {NUM_USERS} users...", "INFO")
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(register_user) for _ in range(NUM_USERS)]
        for future in concurrent.futures.as_completed(futures):
            success, user_data = future.result()
            if success:
                users.append(user_data)
    
    log(f"✓ Registered {len(users)} users", "SUCCESS")
    
    if not users:
        log("No users registered successfully. Exiting.", "ERROR")
        return
    
    # Phase 2: Create quizzes (use admin token if available)
    log(f"\nPhase 2: Creating {NUM_QUIZZES} quizzes...", "INFO")
    admin_token = admin_user["token"] if admin_success else users[0]["token"]
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(create_quiz, admin_token) for _ in range(NUM_QUIZZES)]
        for future in concurrent.futures.as_completed(futures):
            success, quiz_data = future.result()
            if success:
                quizzes.append(quiz_data)
    
    log(f"✓ Created {len(quizzes)} quizzes", "SUCCESS")
    
    if not quizzes:
        log("No quizzes created successfully. Exiting.", "ERROR")
        return
    
    # Phase 3: Simulate user activity
    log(f"\nPhase 3: Simulating user activity (quiz submissions)...", "INFO")
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(user_simulation, user, quizzes) for user in users]
        concurrent.futures.wait(futures)
    
    log(f"✓ Completed quiz submissions", "SUCCESS")
    
    # Phase 4: Access leaderboards
    log(f"\nPhase 4: Accessing leaderboards...", "INFO")
    access_leaderboard(token=admin_token)  # Global
    for category in CATEGORIES:
        access_leaderboard(category, token=admin_token)
    
    log(f"✓ Accessed all leaderboards", "SUCCESS")
    
    elapsed_time = time.time() - start_time
    
    # Print results
    print_metrics()
    print(f"\n⏰ Total execution time: {elapsed_time:.2f} seconds")
    print(f"\n✅ Stress test completed successfully!\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        print_metrics()
        sys.exit(0)
    except Exception as e:
        log(f"Unexpected error: {str(e)}", "ERROR")
        print_metrics()
        sys.exit(1)
