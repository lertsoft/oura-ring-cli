#!/bin/sh
# Oura CLI Installer

set -e

REPO="lertsoft/oura-ring-cli"  
BINARY_NAME="oura"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    printf "${BLUE}ℹ${NC} %s\n" "$1"
}

success() {
    printf "${GREEN}✓${NC} %s\n" "$1"
}

warn() {
    printf "${YELLOW}⚠${NC} %s\n" "$1"
}

error() {
    printf "${RED}✗${NC} %s\n" "$1"
    exit 1
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     echo "linux";;
        Darwin*)    echo "darwin";;
        CYGWIN*|MINGW*|MSYS*) echo "windows";;
        *)          error "Unsupported operating system: $(uname -s)";;
    esac
}

# Detect architecture
detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64)   echo "x64";;
        arm64|aarch64)  echo "arm64";;
        *)              error "Unsupported architecture: $(uname -m)";;
    esac
}

# Get the latest release version from GitHub
get_latest_version() {
    curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | 
        grep '"tag_name":' | 
        sed -E 's/.*"([^"]+)".*/\1/'
}

# Main installation
main() {
    printf "\n"
    printf "${BLUE}╔══════════════════════════════════════╗${NC}\n"
    printf "${BLUE}║${NC}     ${GREEN}Oura CLI Installer${NC}               ${BLUE}║${NC}\n"
    printf "${BLUE}╚══════════════════════════════════════╝${NC}\n"
    printf "\n"

    # Detect platform
    OS=$(detect_os)
    ARCH=$(detect_arch)
    
    info "Detected platform: ${OS}-${ARCH}"

    # Get latest version
    info "Fetching latest version..."
    VERSION=$(get_latest_version)
    
    if [ -z "$VERSION" ]; then
        error "Could not determine latest version. Check your internet connection."
    fi
    
    info "Latest version: ${VERSION}"

    # Build download URL
    if [ "$OS" = "windows" ]; then
        FILENAME="${BINARY_NAME}-${OS}-${ARCH}.exe"
    else
        FILENAME="${BINARY_NAME}-${OS}-${ARCH}"
    fi
    
    DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${FILENAME}"
    
    info "Downloading from: ${DOWNLOAD_URL}"

    # Create temp directory
    TMP_DIR=$(mktemp -d)
    TMP_FILE="${TMP_DIR}/${BINARY_NAME}"
    
    # Download binary
    if command -v curl > /dev/null 2>&1; then
        curl -fsSL "$DOWNLOAD_URL" -o "$TMP_FILE" || error "Download failed. Check if the release exists."
    elif command -v wget > /dev/null 2>&1; then
        wget -q "$DOWNLOAD_URL" -O "$TMP_FILE" || error "Download failed. Check if the release exists."
    else
        error "Neither curl nor wget found. Please install one of them."
    fi

    success "Downloaded successfully"

    # Make executable
    chmod +x "$TMP_FILE"

    # Install to destination
    info "Installing to ${INSTALL_DIR}..."
    
    # Check if we need sudo
    if [ -w "$INSTALL_DIR" ]; then
        mv "$TMP_FILE" "${INSTALL_DIR}/${BINARY_NAME}"
    else
        warn "Need sudo to install to ${INSTALL_DIR}"
        sudo mv "$TMP_FILE" "${INSTALL_DIR}/${BINARY_NAME}"
    fi

    # Cleanup
    rm -rf "$TMP_DIR"

    success "Installed ${BINARY_NAME} to ${INSTALL_DIR}/${BINARY_NAME}"

    # Verify installation
    if command -v "$BINARY_NAME" > /dev/null 2>&1; then
        success "Installation complete!"
        printf "\n"
        printf "${BLUE}ℹ${NC} Run ${GREEN}oura --help${NC} to get started\n"
        printf "${BLUE}ℹ${NC} Run ${GREEN}oura auth${NC} to authenticate with your Oura account\n"
    else
        warn "Installation complete, but ${BINARY_NAME} is not in your PATH"
        printf "\n"
        info "Add ${INSTALL_DIR} to your PATH, or run:"
        printf "    ${YELLOW}export PATH=\"\$PATH:${INSTALL_DIR}\"${NC}\n"
    fi

    printf "\n"
}

main "$@"
