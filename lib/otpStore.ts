interface OtpEntry {
    otp: string;
    expiresAt: number;
    isUsed: boolean;
}

// Global in-memory OTP store for zero-latency, 100% reliable verification
const globalOtpStore = new Map<string, OtpEntry>();

export function storeOtp(phone: string, otp: string, ttlSeconds: number = 300): void {
    const cleanPhone = phone.trim();
    globalOtpStore.set(cleanPhone, {
        otp: otp.trim(),
        expiresAt: Date.now() + ttlSeconds * 1000,
        isUsed: false,
    });
}

export function verifyInMemoryOtp(phone: string, otp: string): { valid: boolean; reason?: string } {
    const cleanPhone = phone.trim();
    const cleanOtp = otp.trim();
    const entry = globalOtpStore.get(cleanPhone);

    if (!entry) {
        return { valid: false, reason: 'OTP not found' };
    }

    if (entry.isUsed) {
        return { valid: false, reason: 'OTP has already been used' };
    }

    if (Date.now() > entry.expiresAt) {
        return { valid: false, reason: 'OTP has expired' };
    }

    if (entry.otp !== cleanOtp) {
        return { valid: false, reason: 'Invalid OTP code' };
    }

    // Mark OTP as used
    entry.isUsed = true;
    return { valid: true };
}
