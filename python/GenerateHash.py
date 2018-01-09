import hashlib
import base58

def generateHash(hashInput):
    bytesOfMessage = hashInput.encode('utf8')
    byte = hashlib.md5(bytesOfMessage).digest()
    return base58.b58encode(byte)

if __name__ == '__main__':
    message1 = 'Intersection 110 45'
    message2 = 'Intersection -74.003388 40.634538'
    message3 = 'Intersection -74.004107 40.63406'
    print generateHash(message1) # // => 'NzUsPtY2FHmqaHuyaVzedp'
    print generateHash(message2) # // => '31H4rsFQijyBvkTSfoRYKP'
    print generateHash(message3) # // => 'Df9nXgEtuHrCb8XJCtsr99'
