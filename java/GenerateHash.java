import base58.Base58;
import java.security.MessageDigest;

public class GenerateHash {
    public static void main(String[] args) {
        GenerateHash test = new GenerateHash();
        System.out.println(test.generateHash("Intersection 110 45")); // => 'NzUsPtY2FHmqaHuyaVzedp'
        System.out.println(test.generateHash("Intersection -74.003388 40.634538")); // => '31H4rsFQijyBvkTSfoRYKP'
        System.out.println(test.generateHash("Intersection -74.004107 40.63406")); // => 'Df9nXgEtuHrCb8XJCtsr99'
    }
    public String generateHash(String hashInput) {
        try {
            byte[] bytesOfMessage = hashInput.getBytes("UTF-8");
            byte[] bytes = MessageDigest.getInstance("MD5").digest(bytesOfMessage);
            String hash = Base58.encode(bytes);
            return hash;
        }
        catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}