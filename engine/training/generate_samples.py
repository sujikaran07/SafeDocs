import os

def create_safe_pdf():
    content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 800] >>\nendobj\n"
        b"xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000110 00000 n \n"
        b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
    )
    with open("testing/safe_sample.pdf", "wb") as f:
        f.write(content)
    print("Created testing/safe_sample.pdf (Should be BENIGN)")

def create_malicious_pdf():
    # Insert /JavaScript triggers
    content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R /OpenAction 4 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 800] >>\nendobj\n"
        b"4 0 obj\n<< /Type /Action /S /JavaScript /JS (app.alert('Hacked!')) >>\nendobj\n"
        b"xref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000110 00000 n \n0000000180 00000 n \n"
        b"trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n260\n%%EOF"
    )
    with open("testing/malicious_sample.pdf", "wb") as f:
        f.write(content)
    print("Created testing/malicious_sample.pdf (Should be MALICIOUS)")

def create_eicar_txt():
    content = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    with open("testing/eicar_standard.txt", "wb") as f:
        f.write(content)
    print("Created testing/eicar_standard.txt (Signature Test)")

if __name__ == "__main__":
    if not os.path.exists("testing"):
        os.makedirs("testing")
    create_safe_pdf()
    create_malicious_pdf()
    create_eicar_txt()
