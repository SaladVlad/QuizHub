#!/bin/bash

# QuizHub Stress Test - Complete End-to-End Scenario
# This script simulates realistic user behavior across all services

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
GATEWAY_URL="${GATEWAY_URL:-http://quizhub.local}"
NUM_USERS="${NUM_USERS:-50}"
NUM_QUIZZES="${NUM_QUIZZES:-20}"
NUM_SUBMISSIONS_PER_USER="${NUM_SUBMISSIONS_PER_USER:-5}"
CONCURRENT_REQUESTS="${CONCURRENT_REQUESTS:-10}"

# Temporary files
USERS_FILE="/tmp/quizhub_stress_users.json"
QUIZZES_FILE="/tmp/quizhub_stress_quizzes.json"
RESULTS_FILE="/tmp/quizhub_stress_results.txt"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     QuizHub Stress Test - Complete E2E Simulation           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}Configuration:${NC}"
echo -e "  Gateway URL: ${YELLOW}${GATEWAY_URL}${NC}"
echo -e "  Users to create: ${YELLOW}${NUM_USERS}${NC}"
echo -e "  Quizzes to create: ${YELLOW}${NUM_QUIZZES}${NC}"
echo -e "  Submissions per user: ${YELLOW}${NUM_SUBMISSIONS_PER_USER}${NC}"
echo -e "  Concurrent requests: ${YELLOW}${CONCURRENT_REQUESTS}${NC}\n"

# Initialize files
echo "[]" > "$USERS_FILE"
echo "[]" > "$QUIZZES_FILE"
echo "" > "$RESULTS_FILE"

# Categories
CATEGORIES=("Science" "History" "Geography" "Mathematics" "Technology" "Literature" "Sports" "Music" "Art" "General Knowledge")

# Function to generate random username
generate_username() {
    echo "user_$(date +%s%N | md5sum | head -c 8)"
}

# Function to generate random email
generate_email() {
    local username=$1
    echo "${username}@quizhub-test.com"
}

# Function to register a user
register_user() {
    local username=$(generate_username)
    local email=$(generate_email $username)
    local password="Test123!@#"
    
    local response=$(curl -s -w "\n%{http_code}" -X POST "${GATEWAY_URL}/api/users/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"${username}\",
            \"email\": \"${email}\",
            \"password\": \"${password}\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\"
        }")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        local token=$(echo "$body" | jq -r '.token // .Token')
        local user_id=$(echo "$body" | jq -r '.user.id // .User.id')
        echo "{\"username\":\"${username}\",\"email\":\"${email}\",\"password\":\"${password}\",\"token\":\"${token}\",\"id\":\"${user_id}\"}"
        return 0
    else
        echo "ERROR: Failed to register user ${username} (HTTP ${http_code})" >&2
        return 1
    fi
}

# Function to login a user
login_user() {
    local username=$1
    local password=$2
    
    local response=$(curl -s -w "\n%{http_code}" -X POST "${GATEWAY_URL}/api/users/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"${username}\",
            \"password\": \"${password}\"
        }")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo "$body" | jq -r '.token // .Token'
        return 0
    else
        return 1
    fi
}

# Function to create a quiz
create_quiz() {
    local token=$1
    local category=${CATEGORIES[$((RANDOM % ${#CATEGORIES[@]}))]}
    local difficulty=$((RANDOM % 3 + 1))
    local num_questions=$((RANDOM % 5 + 5))  # 5-10 questions
    
    local title="Quiz $(date +%s%N | md5sum | head -c 6) - ${category}"
    
    # Generate questions
    local questions="["
    for ((i=0; i<num_questions; i++)); do
        local question_text="Question $((i+1)) for ${title}?"
        local num_answers=4
        
        # Generate answers (one correct, rest incorrect)
        local answers="["
        for ((j=0; j<num_answers; j++)); do
            local is_correct="false"
            if [ $j -eq 0 ]; then
                is_correct="true"
            fi
            answers+="{\"text\":\"Answer $((j+1))\",\"isCorrect\":${is_correct}}"
            if [ $j -lt $((num_answers-1)) ]; then
                answers+=","
            fi
        done
        answers+="]"
        
        questions+="{\"text\":\"${question_text}\",\"questionType\":0,\"answers\":${answers}}"
        if [ $i -lt $((num_questions-1)) ]; then
            questions+=","
        fi
    done
    questions+="]"
    
    local quiz_data=$(cat <<EOF
{
    "title": "${title}",
    "description": "Stress test quiz in ${category}",
    "category": "${category}",
    "difficulty": ${difficulty},
    "timeLimitSeconds": 600,
    "questions": ${questions}
}
EOF
)
    
    local response=$(curl -s -w "\n%{http_code}" -X POST "${GATEWAY_URL}/api/quizzes" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${token}" \
        -d "${quiz_data}")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        echo "$body"
        return 0
    else
        echo "ERROR: Failed to create quiz (HTTP ${http_code})" >&2
        return 1
    fi
}

# Function to get quiz with questions
get_quiz_with_questions() {
    local quiz_id=$1
    local token=$2
    
    curl -s -X GET "${GATEWAY_URL}/api/quizzes/${quiz_id}/with-questions" \
        -H "Authorization: Bearer ${token}"
}

# Function to submit quiz result
submit_result() {
    local token=$1
    local quiz_id=$2
    local quiz_data=$3
    
    # Parse questions and generate answers
    local questions=$(echo "$quiz_data" | jq -r '.questions')
    local num_questions=$(echo "$questions" | jq 'length')
    
    # Calculate random score (60-100%)
    local score=$((RANDOM % 40 + 60))
    local time_taken=$((RANDOM % 300 + 60))  # 60-360 seconds
    
    # Generate answers
    local answers="["
    for ((i=0; i<num_questions; i++)); do
        local question=$(echo "$questions" | jq ".[$i]")
        local question_id=$(echo "$question" | jq -r '.id')
        local correct_answer=$(echo "$question" | jq -r '.answers[] | select(.isCorrect == true) | .text')
        
        # 70% chance of correct answer (to match score roughly)
        local given_answer=""
        if [ $((RANDOM % 100)) -lt 70 ]; then
            given_answer="$correct_answer"
        else
            given_answer="Wrong answer"
        fi
        
        answers+="{\"questionId\":\"${question_id}\",\"givenAnswer\":\"${given_answer}\"}"
        if [ $i -lt $((num_questions-1)) ]; then
            answers+=","
        fi
    done
    answers+="]"
    
    local result_data=$(cat <<EOF
{
    "quizId": "${quiz_id}",
    "score": ${score},
    "timeTakenSeconds": ${time_taken},
    "answers": ${answers}
}
EOF
)
    
    local response=$(curl -s -w "\n%{http_code}" -X POST "${GATEWAY_URL}/api/results" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${token}" \
        -d "${result_data}")
    
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Phase 1: Register users
echo -e "${GREEN}Phase 1: Registering ${NUM_USERS} users...${NC}"
registered_count=0
failed_count=0

for ((i=1; i<=NUM_USERS; i++)); do
    if user_data=$(register_user); then
        echo "$user_data" | jq '.' >> "$USERS_FILE.tmp"
        ((registered_count++))
        echo -ne "\r  Registered: ${registered_count}/${NUM_USERS}"
    else
        ((failed_count++))
    fi
    
    # Rate limiting - small delay
    sleep 0.1
done

# Combine users into array
jq -s '.' "$USERS_FILE.tmp" > "$USERS_FILE"
rm -f "$USERS_FILE.tmp"

echo -e "\n${GREEN}✓ Registered ${registered_count} users (${failed_count} failures)${NC}\n"

# Select one admin user for creating quizzes
ADMIN_USER=$(jq '.[0]' "$USERS_FILE")
ADMIN_TOKEN=$(echo "$ADMIN_USER" | jq -r '.token')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
    echo -e "${RED}✗ No valid admin token. Cannot proceed.${NC}"
    exit 1
fi

# Phase 2: Create quizzes
echo -e "${GREEN}Phase 2: Creating ${NUM_QUIZZES} quizzes...${NC}"
created_count=0

for ((i=1; i<=NUM_QUIZZES; i++)); do
    if quiz_data=$(create_quiz "$ADMIN_TOKEN"); then
        echo "$quiz_data" | jq '.' >> "$QUIZZES_FILE.tmp"
        ((created_count++))
        echo -ne "\r  Created: ${created_count}/${NUM_QUIZZES}"
    fi
    sleep 0.1
done

jq -s '.' "$QUIZZES_FILE.tmp" > "$QUIZZES_FILE"
rm -f "$QUIZZES_FILE.tmp"

echo -e "\n${GREEN}✓ Created ${created_count} quizzes${NC}\n"

# Phase 3: Users browse and take quizzes
echo -e "${GREEN}Phase 3: Simulating quiz submissions...${NC}"
total_submissions=0
total_users=$(jq 'length' "$USERS_FILE")
total_quizzes=$(jq 'length' "$QUIZZES_FILE")

if [ "$total_quizzes" -eq 0 ]; then
    echo -e "${RED}✗ No quizzes available for submission${NC}"
    exit 1
fi

for ((user_idx=0; user_idx<total_users; user_idx++)); do
    user=$(jq ".[$user_idx]" "$USERS_FILE")
    token=$(echo "$user" | jq -r '.token')
    username=$(echo "$user" | jq -r '.username')
    
    echo -e "\n  ${YELLOW}User: ${username}${NC}"
    
    # Each user takes random quizzes
    for ((sub=0; sub<NUM_SUBMISSIONS_PER_USER; sub++)); do
        # Select random quiz
        quiz_idx=$((RANDOM % total_quizzes))
        quiz=$(jq ".[$quiz_idx]" "$QUIZZES_FILE")
        quiz_id=$(echo "$quiz" | jq -r '.id')
        quiz_title=$(echo "$quiz" | jq -r '.title')
        
        # Get quiz with questions
        quiz_data=$(get_quiz_with_questions "$quiz_id" "$token")
        
        # Submit result
        if submit_result "$token" "$quiz_id" "$quiz_data"; then
            ((total_submissions++))
            echo -e "    ✓ Submitted: ${quiz_title}"
        else
            echo -e "    ✗ Failed: ${quiz_title}"
        fi
        
        sleep 0.05
    done
done

echo -e "\n${GREEN}✓ Completed ${total_submissions} quiz submissions${NC}\n"

# Phase 4: Access leaderboards
echo -e "${GREEN}Phase 4: Accessing leaderboards...${NC}"

# Global leaderboard
echo -e "  ${YELLOW}Fetching global leaderboard...${NC}"
curl -s "${GATEWAY_URL}/api/results/leaderboard/global?top=10" > /dev/null
echo -e "  ✓ Global leaderboard accessed"

# Category leaderboards
for category in "${CATEGORIES[@]}"; do
    echo -e "  ${YELLOW}Fetching ${category} leaderboard...${NC}"
    curl -s "${GATEWAY_URL}/api/results/leaderboard/category/${category}?top=10" > /dev/null
    echo -e "  ✓ ${category} leaderboard accessed"
    sleep 0.1
done

# Phase 5: View user profiles and stats
echo -e "\n${GREEN}Phase 5: Viewing user profiles and stats...${NC}"
sample_size=$((total_users < 10 ? total_users : 10))

for ((i=0; i<sample_size; i++)); do
    user=$(jq ".[$i]" "$USERS_FILE")
    token=$(echo "$user" | jq -r '.token')
    user_id=$(echo "$user" | jq -r '.id')
    username=$(echo "$user" | jq -r '.username')
    
    # Get user stats
    curl -s "${GATEWAY_URL}/api/results/stats/${user_id}" \
        -H "Authorization: Bearer ${token}" > /dev/null
    
    # Get user results
    curl -s "${GATEWAY_URL}/api/results/user/${user_id}?page=1&pageSize=10" \
        -H "Authorization: Bearer ${token}" > /dev/null
    
    echo -e "  ✓ Viewed profile: ${username}"
    sleep 0.1
done

# Summary
echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   Stress Test Complete                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}Summary:${NC}"
echo -e "  Users registered: ${GREEN}${registered_count}${NC}"
echo -e "  Quizzes created: ${GREEN}${created_count}${NC}"
echo -e "  Results submitted: ${GREEN}${total_submissions}${NC}"
echo -e "  Leaderboards accessed: ${GREEN}$((${#CATEGORIES[@]} + 1))${NC}"
echo -e "  Profiles viewed: ${GREEN}${sample_size}${NC}"

echo -e "\n${YELLOW}Data files:${NC}"
echo -e "  Users: ${USERS_FILE}"
echo -e "  Quizzes: ${QUIZZES_FILE}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "  - Check Jaeger for distributed traces"
echo -e "  - Check Kibana for logs"
echo -e "  - Check Grafana for metrics"
echo -e "  - View leaderboards in the UI"

echo -e "\n${GREEN}Done! 🎉${NC}\n"
