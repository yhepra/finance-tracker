# ============================================
# Stage 1: Build
# ============================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files first for better layer caching
COPY FinanceTracker.slnx ./
COPY src/API/FinanceTracker.API.csproj                    src/API/
COPY src/Core/Application/FinanceTracker.Application.csproj src/Core/Application/
COPY src/Core/Domain/FinanceTracker.Domain.csproj          src/Core/Domain/
COPY src/Infrastructure/FinanceTracker.Infrastructure.csproj src/Infrastructure/

# Restore dependencies (cached unless .csproj files change)
RUN dotnet restore FinanceTracker.slnx

# Copy the rest of the source code
COPY . .

# Publish the API project in Release mode
RUN dotnet publish src/API/FinanceTracker.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ============================================
# Stage 2: Runtime
# ============================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Install ICU libs for globalization support
RUN apt-get update && apt-get install -y --no-install-recommends \
    libicu-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy published output
COPY --from=build /app/publish .

# Expose the backend port
EXPOSE 5116

# Set environment variables
ENV ASPNETCORE_URLS=http://+:5116
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "FinanceTracker.API.dll"]
