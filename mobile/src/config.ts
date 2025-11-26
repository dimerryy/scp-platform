/**
 * API Configuration
 * 
 * Automatically detects platform and uses the correct URL:
 * - iOS Simulator: Uses `http://127.0.0.1:8000` (localhost works)
 * - Android Emulator: Uses `http://10.0.2.2:8000` (special IP for host machine)
 * 
 * For Physical Devices:
 * - Use your LAN IP: `http://<your-LAN-IP>:8000`
 *   (Find your IP with: `ipconfig getifaddr en0` on Mac or `ipconfig` on Windows)
 * 
 * For Production:
 * - Use your actual backend URL: `https://api.yourdomain.com`
 * 
 * To override, manually set API_BASE_URL below instead of using the Platform check.
 */
export const API_BASE_URL = 'http://192.168.0.189:8000';
// Platform.select({
//   ios: 'http://127.0.0.1:8000',      // iOS Simulator - localhost works
//   android: 'http://10.0.2.2:8000',   // Android Emulator - must use 10.0.2.2
//   default: 'http://127.0.0.1:8000',  // Default fallback
// }) || 'http://127.0.0.1:8000'

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'scp_access_token',
  USER: 'scp_user',
} as const
