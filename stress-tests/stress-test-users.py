#!/usr/bin/env python3

"""
QuizHub Stress Test - User Activities Only
Tests realistic user behavior: register, login, view quizzes, view leaderboards
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
GATEWAY_URL = "http://quizhub.local"
NUM_USERS = 50
MAX_WORKERS = 10
QUIZZES_PER_USER = 5
LEADERBOARDS_PER_USER = 3

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
    "quiz_fetch_success": 0,
    "quiz_fetch_fail": 0,
    "leaderboard_success": 0,
    "leaderboard_fail": 0,
    "response_times": defaultdict(list),
}
metrics_lock = threading.Lock()

# Data storage
users = []


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
            f"{GATEWAY_URL}/api/users/auth/register",
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
            update_metric("register_fail")
            return False, {}
    except Exception as e:
        duration = time.time() - start_time
        record_response_time("register", duration)
        update_metric("register_fail")
        return False, {}


def login_user(username: str, password: str) -> Tuple[bool, str]:
    """Login a user"""
    payload = {
        "username": username,
        "password": password
    }
    
    start_time = time.time()
    try:
        response = requests.post(
            f"{GATEWAY_URL}/api/users/auth/login",
            json=payload,
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


def get_quizzes(page: int = 1) -> bool:
    """Get list of quizzes"""
    start_time = time.time()
    try:
        response = requests.get(
            f"{GATEWAY_URL}/api/quizzes?page={page}&pageSize=10",
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


def get_quiz_by_category(category: str) -> bool:
    """Get quizzes by category"""
    start_time = time.time()
    try:
        response = requests.get(
            f"{GATEWAY_URL}/api/quizzes/category/{category}?page=1&pageSize=10",
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


def access_leaderboard(category: str = None) -> bool:
    """Access leaderboard"""
    start_time = time.time()
    try:
        if category:
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


def user_simulation(user_data: Dict):
    """Simulate a single user's activity"""
    username = user_data.get("username")
    password = user_data.get("password")
    
    # Login
    success, token = login_user(username, password)
    if not success:
        return
    
    # Browse quizzes
    for _ in range(QUIZZES_PER_USER):
        page = random.randint(1, 3)
        get_quizzes(page)
        time.sleep(0.1)
    
    # Browse quizzes by category
    for _ in range(2):
        category = random.choice(CATEGORIES)
        get_quiz_by_category(category)
        time.sleep(0.1)
    
    # Check leaderboards
    for _ in range(LEADERBOARDS_PER_USER):
        if random.random() < 0.5:
            access_leaderboard()  # Global
        else:
            category = random.choice(CATEGORIES)
            access_leaderboard(category)
        time.sleep(0.1)


def print_metrics():
    """Print final metrics"""
    print("\n" + "="*70)
    print("                    STRESS TEST RESULTS")
    print("="*70)
    
    print("\n📊 Operation Metrics:")
    print(f"  Registration:    ✓ {metrics['register_success']:4d}  ✗ {metrics['register_fail']:4d}")
    print(f"  Login:           ✓ {metrics['login_success']:4d}  ✗ {metrics['login_fail']:4d}")
    print(f"  Quiz Fetch:      ✓ {metrics['quiz_fetch_success']:4d}  ✗ {metrics['quiz_fetch_fail']:4d}")
    print(f"  Leaderboard:     ✓ {metrics['leaderboard_success']:4d}  ✗ {metrics['leaderboard_fail']:4d}")
    
    print("\n⏱️  Response Times (avg):")
    for operation, times in metrics["response_times"].items():
        if times:
            avg_time = sum(times) / len(times)
            min_time = min(times)
            max_time = max(times)
            p95_time = sorted(times)[int(len(times) * 0.95)] if len(times) > 1 else max_time
            print(f"  {operation:15s}: avg={avg_time:6.3f}s  min={min_time:.3f}s  max={max_time:.3f}s  p95={p95_time:.3f}s")
    
    total_success = (metrics['register_success'] + metrics['login_success'] + 
                    metrics['quiz_fetch_success'] + metrics['leaderboard_success'])
    total_fail = (metrics['register_fail'] + metrics['login_fail'] + 
                 metrics['quiz_fetch_fail'] + metrics['leaderboard_fail'])
    total = total_success + total_fail
    
    if total > 0:
        success_rate = (total_success / total) * 100
        print(f"\n✅ Overall Success Rate: {success_rate:.2f}%")
    
    total_requests = total
    print(f"📈 Total Requests: {total_requests}")
    
    print("\n" + "="*70)


def main():
    """Main stress test execution"""
    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║      QuizHub Stress Test - User Activities (Realistic)      ║")
    print("╚══════════════════════════════════════════════════════════════╝\n")
    
    print(f"Configuration:")
    print(f"  Gateway URL: {GATEWAY_URL}")
    print(f"  Users: {NUM_USERS}")
    print(f"  Quiz views per user: {QUIZZES_PER_USER}")
    print(f"  Leaderboard views per user: {LEADERBOARDS_PER_USER}")
    print(f"  Max concurrent workers: {MAX_WORKERS}\n")
    
    start_time = time.time()
    
    # Phase 1: Register users
    log(f"Phase 1: Registering {NUM_USERS} users...", "INFO")
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
    
    # Phase 2: Simulate user activity
    log(f"\nPhase 2: Simulating user activity (logins, browsing, leaderboards)...", "INFO")
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(user_simulation, user) for user in users]
        concurrent.futures.wait(futures)
    
    log(f"✓ Completed user activity simulation", "SUCCESS")
    
    elapsed_time = time.time() - start_time
    
    # Print results
    print_metrics()
    print(f"\n⏰ Total execution time: {elapsed_time:.2f} seconds")
    
    total_requests = (metrics['register_success'] + metrics['login_success'] + 
                     metrics['quiz_fetch_success'] + metrics['leaderboard_success'])
    if elapsed_time > 0:
        rps = total_requests / elapsed_time
        print(f"⚡ Requests per second: {rps:.2f}")
    
    print(f"\n✅ Stress test completed successfully!\n")
    print("Check your observability stack:")
    print("  🔍 Jaeger: kubectl port-forward -n observability svc/jaeger-query 16686:16686")
    print("  📊 Kibana: kubectl port-forward -n observability svc/kibana 5601:5601")
    print("  📈 Grafana: kubectl port-forward -n observability svc/grafana 3000:80\n")


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
