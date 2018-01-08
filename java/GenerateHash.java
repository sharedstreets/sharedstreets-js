import core.Base58;
import java.security.MessageDigest;

public class GenerateHash {
    public static void main(String[] args) {
        GenerateHash test = new GenerateHash();
        test.generateHash("Intersection 110 45");
        test.generateHash("Intersection -74.003388 40.634538");
        test.generateHash("Intersection -74.004107 40.63406");
    }
    public void generateHash(String hashInput) {
        try {
            byte[] bytesOfMessage = hashInput.getBytes("UTF-8");
            System.out.println(hashInput);
            System.out.print("bytesOfMessage => ");
            for (byte b: bytesOfMessage){
                System.out.print(b + " ");
            }
            System.out.print('\n');
            // System.out.println('bytesOfMessage');
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] bytes = md.digest(bytesOfMessage);
            System.out.print("md.digest => ");
            for (byte b: bytes){
                System.out.print(b + " ");
            }
            System.out.print('\n');
            // System.out.println('md digest');
            String hash = Base58.encode(bytes);
            System.out.println(hashInput + " => " + hash);
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }
}