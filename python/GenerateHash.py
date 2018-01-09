import hashlib
import base58

def geometry(line):
    coords = ['{x:.6f} {y:.6f}'.format(x=x, y=y) for (x, y) in line]
    message = 'Geometry {}'.format(' '.join(coords))
    return generateHash(message)

def intersection(pt):
    message = 'Intersection {x:.6f} {y:.6f}'.format(x=pt[0], y=pt[1])
    return generateHash(message)

def generateHash(message):
    bytesOfMessage = message.encode('utf8')
    byte = hashlib.md5(bytesOfMessage).digest()
    return base58.b58encode(byte)

if __name__ == '__main__':
    # fixtures
    message1 = 'Intersection 110.000000 45.000000'
    message2 = 'Intersection -74.003388 40.634538'
    message3 = 'Intersection -74.004107 40.634060'
    coord1 = [110, 45]
    coord2 = [-74.003388, 40.634538]
    coord3 = [-74.004107, 40.63406]
    geom1 = [[110, 45], [115, 50], [120, 55]]
    geom2 = [[-74.007568359375, 40.75239562988281], [-74.00729370117188, 40.753089904785156]]
    geom3 = [[-74.00778198242188, 40.72457504272461], [-74.0076675415039, 40.72519302368164]]

    # generateHash
    assert generateHash(message1) == 'F585H3jn72yicbJhf4791w'
    assert generateHash(message2) == '31H4rsFQijyBvkTSfoRYKP'
    assert generateHash(message3) == '2su5qcfh1QgXkTLXcMGbU9'

    # intersection
    assert intersection(coord1) == 'F585H3jn72yicbJhf4791w'
    assert intersection(coord2) == '31H4rsFQijyBvkTSfoRYKP'
    assert intersection(coord3) == '2su5qcfh1QgXkTLXcMGbU9'

    # geometry
    assert geometry(geom1) == 'SWkr931VN89aHemb4L7MDS'
    assert geometry(geom2) == 'L6UL4SQSnKAM7vU1HpLGG'
    assert geometry(geom3) == 'Bx91v4fCvcMFiwd2Mrptio'
