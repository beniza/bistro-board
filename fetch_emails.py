import os
import imaplib
import email
from email.header import decode_header
import sys
from dotenv import load_dotenv

# Reconfigure stdout for utf-8 encoding support
sys.stdout.reconfigure(encoding='utf-8')

# Load local environment settings
load_dotenv()

GMAIL_USER = os.getenv("GMAIL_USER", "philosdelicacy@gmail.com")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(SCRIPT_DIR, "sales_reports")

def fetch_reports(progress_callback=None):
    def log_progress(msg, step=None, total=None):
        print(msg)
        if progress_callback:
            progress_callback(msg, step, total)

    if not GMAIL_APP_PASSWORD:
        log_progress("Gmail App Password not configured. Skipping email fetch.")
        return {"status": "skipped", "message": "GMAIL_APP_PASSWORD not set in .env"}
        
    log_progress(f"Connecting to Gmail for {GMAIL_USER}...")
    try:
        # Connect to Gmail IMAP
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        mail.select("inbox")
        
        import datetime
        since_date = (datetime.date.today() - datetime.timedelta(days=30)).strftime("%d-%b-%Y")
        # Search query matching Zomato, Swiggy, and Counter subjects received in the last 30 days
        search_query = f'SINCE {since_date} OR (OR (OR (SUBJECT "Annexure") (SUBJECT "Settlement")) (SUBJECT "Philos-KKND")) (SUBJECT "Swiggy Payments")'
        status, messages = mail.search(None, search_query)
        if status != "OK" or not messages[0]:
            log_progress("No matching emails found.")
            mail.logout()
            return {"status": "success", "downloaded": 0, "message": "No reports found in email search."}
            
        mail_ids = messages[0].split()
        total_emails = len(mail_ids)
        log_progress(f"Found {total_emails} potential emails to check.")
        
        stats = {"counter": 0, "swiggy": 0, "zomato": 0}
        downloaded_files = []
        
        # Scan all matching emails to retrieve all historical data (like 2025 June-Dec)
        for idx, mail_id in enumerate(mail_ids):
            log_progress(f"Scanning email {idx+1}/{total_emails} for attachments...", step=idx+1, total=total_emails)
            status, data = mail.fetch(mail_id, "(RFC822)")
            if status != "OK":
                continue
                
            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            # Decode subject
            subject_header = msg["Subject"]
            subject = ""
            if subject_header:
                decoded_parts = decode_header(subject_header)
                for part_bytes, encoding in decoded_parts:
                    if isinstance(part_bytes, bytes):
                        subject += part_bytes.decode(encoding or "utf-8", errors="ignore")
                    else:
                        subject += str(part_bytes)
            
            # Decode sender
            sender = msg.get("From", "")
            
            for part in msg.walk():
                if part.get_content_maintype() == "multipart":
                    continue
                if part.get("Content-Disposition") is None:
                    continue
                    
                filename = part.get_filename()
                if not filename:
                    continue
                    
                # Decode filename
                decoded_parts = decode_header(filename)
                decoded_fn = ""
                for part_bytes, encoding in decoded_parts:
                    if isinstance(part_bytes, bytes):
                        decoded_fn += part_bytes.decode(encoding or "utf-8", errors="ignore")
                    else:
                        decoded_fn += str(part_bytes)
                
                filename = os.path.basename(decoded_fn)
                
                if filename.endswith(".xlsx"):
                    dest_folder = None
                    fn_lower = filename.lower()
                    sub_lower = subject.lower()
                    snd_lower = sender.lower()
                    
                    if "annexure" in fn_lower or "swiggy" in snd_lower or "swiggy" in sub_lower:
                        dest_folder = os.path.join(REPORTS_DIR, "swiggy")
                        label = "swiggy"
                    elif "settlement" in fn_lower or "zomato" in snd_lower or "zomato" in sub_lower:
                        dest_folder = os.path.join(REPORTS_DIR, "zomato")
                        label = "zomato"
                    elif "philos-kknd" in fn_lower or "counter" in sub_lower or ("philos" in fn_lower and "zomato" not in fn_lower):
                        dest_folder = os.path.join(REPORTS_DIR, "counter")
                        label = "counter"
                        
                    if dest_folder:
                        os.makedirs(dest_folder, exist_ok=True)
                        filepath = os.path.join(dest_folder, filename)
                        
                        # Save if file doesn't exist yet
                        if not os.path.exists(filepath):
                            with open(filepath, "wb") as f:
                                f.write(part.get_payload(decode=True))
                            stats[label] += 1
                            downloaded_files.append(filename)
                            log_progress(f"Downloaded new report: {filename} ({label})")
                            
        mail.logout()
        total_downloads = sum(stats.values())
        log_progress(f"Gmail scan completed. Downloaded {total_downloads} new reports.")
        return {
            "status": "success",
            "downloaded": total_downloads,
            "stats": stats,
            "files": downloaded_files,
            "message": f"Gmail scan completed. Downloaded {total_downloads} new reports."
        }
        
    except Exception as e:
        log_progress(f"IMAP Connection/Auth Error: {e}")
        return {"status": "error", "message": f"Gmail fetch failed: {str(e)}"}

if __name__ == "__main__":
    res = fetch_reports()
    print("Result:", res)
