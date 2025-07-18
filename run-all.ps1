# Run UserService
Start-Process powershell -ArgumentList 'dotnet run --project Services/UserService/UserService.Api --urls http://localhost:5001'

# Run QuizService
Start-Process powershell -ArgumentList 'dotnet run --project Services/QuizService/QuizService.Api --urls http://localhost:5002'

# Run ResultService
Start-Process powershell -ArgumentList 'dotnet run --project Services/ResultService/ResultService.Api --urls http://localhost:5003'

# Run Gateway
Start-Process powershell -ArgumentList 'dotnet run --project Services/Gateway/Gateway.Api --urls http://localhost:5004'
