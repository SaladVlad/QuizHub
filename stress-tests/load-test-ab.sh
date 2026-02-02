#!/bin/bash

# QuizHub Load Test - Apache Bench (ab) Based
# High-performance concurrent load testing

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

GATEWAY_URL="${GATEWAY_URL:-http://quizhub.local}"
CONCURRENT="${CONCURRENT:-50}"
REQUESTS="${REQUESTS:-1000}"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        QuizHub Load Test - Apache Bench                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}\n"

# Check if ab is installed
if ! command -v ab &> /dev/null; then
    echo -e "${RED}Apache Bench (ab) is not installed.${NC}"
    echo -e "${YELLOW}Install it with: sudo apt-get install apache2-utils${NC}"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}jq is not installed.${NC}"
    echo -e "${YELLOW}Install it with: sudo apt-get install jq${NC}"
    exit 1
fi

echo -e "${BLUE}Configuration:${NC}"
echo -e "  Gateway URL: ${YELLOW}${GATEWAY_URL}${NC}"
echo -e "  Concurrent: ${YELLOW}${CONCURRENT}${NC}"
echo -e "  Total Requests: ${YELLOW}${REQUESTS}${NC}\n"

# Create a test user and login
echo -e "${GREEN}Setting up test user...${NC}"
TEST_USER="loadtest_$(date +%s)"
TEST_PASSWORD="LoadTest123Pass"

REGISTER_RESPONSE=$(curl -s -X POST "${GATEWAY_URL}/api/users/auth/register" \
    -F "username=${TEST_USER}" \
    -F "email=${TEST_USER}@test.com" \
    -F "password=${TEST_PASSWORD}" \
    -F "firstName=Load" \
    -F "lastName=Test")

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // .Token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}Failed to register test user${NC}"
    echo -e "${YELLOW}Response: ${REGISTER_RESPONSE}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Test user created and authenticated${NC}\n"

# Promote user to Admin so they can create quizzes
echo -e "${GREEN}Promoting user to Admin...${NC}"
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id // .User.id')
curl -s -X PUT "${GATEWAY_URL}/api/users/${USER_ID}/promote" \
    -H "Authorization: Bearer ${TOKEN}" > /dev/null

# Create a test quiz
echo -e "${GREEN}Creating test quiz...${NC}"
QUIZ_RESPONSE=$(curl -s -X POST "${GATEWAY_URL}/api/quizzes" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{
        "title": "Load Test Quiz",
        "description": "Quiz for load testing",
        "category": "Testing",
        "difficulty": 2,
        "timeLimitSeconds": 600,
        "questions": [
            {
                "text": "Test Question 1?",
                "questionType": 0,
                "answers": [
                    {"text": "Correct Answer", "isCorrect": true},
                    {"text": "Wrong Answer 1", "isCorrect": false},
                    {"text": "Wrong Answer 2", "isCorrect": false},
                    {"text": "Wrong Answer 3", "isCorrect": false}
                ]
            }
        ]
    }')

QUIZ_ID=$(echo "$QUIZ_RESPONSE" | jq -r '.id')

if [ -z "$QUIZ_ID" ] || [ "$QUIZ_ID" = "null" ]; then
    echo -e "${RED}Failed to create test quiz (user might not have admin rights)${NC}"
    echo -e "${YELLOW}Continuing with tests that don't require quiz creation...${NC}"
fi

echo -e "${GREEN}✓ Test quiz created (ID: ${QUIZ_ID})${NC}\n"

# Test 1: Public endpoints (no auth)
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 1: GET /api/quizzes (Public - No Auth)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
ab -n $REQUESTS -c $CONCURRENT "${GATEWAY_URL}/api/quizzes?page=1&pageSize=10"

if [ -n "$QUIZ_ID" ] && [ "$QUIZ_ID" != "null" ]; then
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Test 2: GET /api/quizzes/{id} (Public - No Auth)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    ab -n $REQUESTS -c $CONCURRENT "${GATEWAY_URL}/api/quizzes/${QUIZ_ID}"
else
    echo -e "\n${YELLOW}Skipping quiz-specific tests (no quiz created)${NC}"
fi

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 3: GET /api/results/leaderboard/global (Public)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
ab -n $REQUESTS -c $CONCURRENT "${GATEWAY_URL}/api/results/leaderboard/global?top=10"

# Test 4: Authenticated endpoints
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 4: GET /api/users/auth/currentUser (Authenticated)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
ab -n $REQUESTS -c $CONCURRENT -H "Authorization: Bearer ${TOKEN}" "${GATEWAY_URL}/api/users/auth/currentUser"

# Test 5: Login endpoint
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 5: POST /api/users/auth/login (Login)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Create a file with login payload
cat > /tmp/login_payload.json <<EOF
{
    "UsernameOrEmail": "${TEST_USER}",
    "Password": "${TEST_PASSWORD}"
}
EOF

ab -n $REQUESTS -c $CONCURRENT -p /tmp/login_payload.json -T "application/json" "${GATEWAY_URL}/api/users/auth/login"
rm /tmp/login_payload.json

echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  Load Test Complete                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${YELLOW}Check your observability stack:${NC}"
echo -e "  - Jaeger: kubectl port-forward -n observability svc/jaeger-query 16686:16686"
echo -e "  - Kibana: kubectl port-forward -n observability svc/kibana 5601:5601"
echo -e "  - Grafana: kubectl port-forward -n observability svc/grafana 3000:80"

echo -e "\n${GREEN}Done! 🚀${NC}\n"
