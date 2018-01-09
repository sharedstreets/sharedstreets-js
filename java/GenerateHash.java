import base58.Base58;
import java.security.MessageDigest;

public class GenerateHash {
    public static void main(String[] args) {
        // fixtures
        String message1 = "Intersection 110.000000 45.000000"
        String message2 = "Intersection -74.003388 40.634538"
        String message3 = "Intersection -74.004107 40.634060"
        double[] coord1 = {110, 45};
        double[] coord2 = {-74.003388, 40.634538};
        double[] coord3 = {-74.004107, 40.63406};
        double[][] geom1 = {{110, 45}, {115, 50}, {120, 55}};
        double[][] geom2 = {{-74.007568359375, 40.75239562988281}, {-74.00729370117188, 40.753089904785156}};
        double[][] geom3 = {{-74.00778198242188, 40.72457504272461}, {-74.0076675415039, 40.72519302368164}};

        // generateHash
        assert GenerateHash.generateHash(message1) == "F585H3jn72yicbJhf4791w";
        assert GenerateHash.generateHash(message2) == "31H4rsFQijyBvkTSfoRYKP";
        assert GenerateHash.generateHash(message3) == "2su5qcfh1QgXkTLXcMGbU9";

        // intersection
        assert GenerateHash.intersection(coord1) == "F585H3jn72yicbJhf4791w";
        assert GenerateHash.intersection(coord2) == "31H4rsFQijyBvkTSfoRYKP";
        assert GenerateHash.intersection(coord3) == "2su5qcfh1QgXkTLXcMGbU9";

        // geometry
        assert GenerateHash.geometry(geom1) == "SWkr931VN89aHemb4L7MDS";
        assert GenerateHash.geometry(geom2) == "L6UL4SQSnKAM7vU1HpLGG";
        assert GenerateHash.geometry(geom3) == "Bx91v4fCvcMFiwd2Mrptio";
    }
    public static String generateHash(String message) {
        try {
            byte[] bytesOfMessage = message.getBytes("UTF-8");
            byte[] bytes = MessageDigest.getInstance("MD5").digest(bytesOfMessage);
            return Base58.encode(bytes);
        }
        catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
    public static String geometry(double[][] line) {
        String message = "Geometry";

        for(int i = 0; i < line.length; i++) {
            message += String.format(" %.6f %.6f", line[i][0], line[i][1]);
        }
        return GenerateHash.generateHash(message);
    }
    public static String intersection(double[] pt) {
        String message = String.format("Intersection %.6f %.6f", pt[0], pt[1]);

        return GenerateHash.generateHash(message);
    }
}