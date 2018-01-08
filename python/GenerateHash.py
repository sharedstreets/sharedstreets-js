# Reference
''' https://github.com/sharedstreets/sharedstreets-builder/blob/e5dd30da787f/src/main/java/io/sharedstreets/data/SharedStreetsReference.java#L323-L340
'''
coords = [LR.id for LR in (self.loc_ref_0, self.loc_ref_1)]
string = 'Reference {} {}'.format(self.form_of_way, ' '.join(coords))
return hashlib.md5(string.encode('utf8')).hexdigest()

# Location Reference
''' https://github.com/sharedstreets/sharedstreets-builder/blob/e5dd30da787f/src/main/java/io/sharedstreets/data/SharedStreetsReference.java#L323-L340
'''
parts = ['{x:.6f} {y:.6f}'.format(x=self.x, y=self.y)]
if self.bearing is not None:
    parts.append('{b:.0f} {d:.0f}'.format(b=self.bearing, d=self.distance*100))
if self.out_bearing is not None:
    parts.append('{b:.0f}'.format(b=self.out_bearing))
return ' '.join(parts)

# Intersection
''' https://github.com/sharedstreets/sharedstreets-builder/blob/e5dd30da787f/src/main/java/io/sharedstreets/data/SharedStreetsIntersection.java#L42-L49
'''
string = 'Intersection {x:.6f} {y:.6f}'.format(**self.__dict__)
return hashlib.md5(string.encode('utf8')).hexdigest()

# Geometry
''' https://github.com/sharedstreets/sharedstreets-builder/blob/e5dd30da787f/src/main/java/io/sharedstreets/data/SharedStreetsGeometry.java#L98-L108
'''
coords = ['{x:.6f} {y:.6f}'.format(x=x, y=y) for (x, y) in self.line.coords]
string = 'Geometry {}'.format(' '.join(coords))
return hashlib.md5(string.encode('utf8')).hexdigest()