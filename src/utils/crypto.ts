import CryptoJS from 'crypto-js'

const key = CryptoJS.enc.Utf8.parse('E36CB2819B6B487C9665B19F157212C9')
const iv = CryptoJS.enc.Utf8.parse('D26C2657E9514DE1')

/** AES 加密 */
export function encrypt(word: string) {
  if (!word)
    return null
  const message = CryptoJS.enc.Utf8.parse(word)
  const encrypted = CryptoJS.AES.encrypt(message, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64)
}

/** AES 解密 */
export function decrypt(ciphertext: string) {
  if (!ciphertext)
    return ''
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return decrypted.toString(CryptoJS.enc.Utf8)
}
