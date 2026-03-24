FROM mcr.microsoft.com/devcontainers/javascript-node:18

# Install Expo CLI globally
RUN npm install -g @expo/cli

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*