import os
import urllib.request
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from dotenv import load_dotenv

# Load local environment settings
load_dotenv()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.path.join(SCRIPT_DIR, "google_credentials.json")
DEST_PATH = os.path.join(SCRIPT_DIR, r"docs\Kakkanad Business Register.xlsx")
GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "")

def download_register_sheet(progress_callback=None):
    def log_progress(msg):
        print(msg)
        if progress_callback:
            progress_callback(msg)

    if not os.path.exists(CREDENTIALS_FILE):
        log_progress("Google credentials file 'google_credentials.json' not found. Skipping Google Sheet download.")
        return False
        
    if not GOOGLE_SHEET_ID:
        log_progress("GOOGLE_SHEET_ID not set in .env. Skipping Google Sheet download.")
        return False

    log_progress("Authenticating with Google Drive API using service account...")
    try:
        # Load service account credentials with Drive read scope
        scopes = ['https://www.googleapis.com/auth/drive.readonly']
        creds = service_account.Credentials.from_service_account_file(
            CREDENTIALS_FILE, scopes=scopes
        )
        
        # Request access token
        creds.refresh(Request())
        token = creds.token
        
        log_progress(f"Exporting Google Sheet ID '{GOOGLE_SHEET_ID}' as Excel workbook...")
        
        # Build export URL
        export_url = f"https://www.googleapis.com/drive/v3/files/{GOOGLE_SHEET_ID}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
        # Make authorized request
        req = urllib.request.Request(export_url)
        req.add_header('Authorization', f'Bearer {token}')
        
        os.makedirs(os.path.dirname(DEST_PATH), exist_ok=True)
        
        # Download and overwrite local xlsx file
        with urllib.request.urlopen(req) as response:
            with open(DEST_PATH, "wb") as f:
                f.write(response.read())
                
        log_progress(f"Successfully synced Google Sheet to local register: docs\\Kakkanad Business Register.xlsx")
        return True
        
    except Exception as e:
        log_progress(f"Google Sheet sync warning: {e}")
        return False

if __name__ == "__main__":
    download_register_sheet()
