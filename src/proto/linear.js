/*eslint-disable block-scoped-var, no-redeclare, no-control-regex, no-prototype-builtins*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.LinearReference = (function() {

    /**
     * Properties of a LinearReference.
     * @exports ILinearReference
     * @interface ILinearReference
     * @property {number|Long|null} [startDistance] LinearReference startDistance
     * @property {number|Long|null} [endDistance] LinearReference endDistance
     */

    /**
     * Constructs a new LinearReference.
     * @exports LinearReference
     * @classdesc Represents a LinearReference.
     * @implements ILinearReference
     * @constructor
     * @param {ILinearReference=} [properties] Properties to set
     */
    function LinearReference(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * LinearReference startDistance.
     * @member {number|Long} startDistance
     * @memberof LinearReference
     * @instance
     */
    LinearReference.prototype.startDistance = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * LinearReference endDistance.
     * @member {number|Long} endDistance
     * @memberof LinearReference
     * @instance
     */
    LinearReference.prototype.endDistance = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    // OneOf field names bound to virtual getters and setters
    var $oneOfFields;

    /**
     * LinearReference endDistancePresent.
     * @member {"endDistance"|undefined} endDistancePresent
     * @memberof LinearReference
     * @instance
     */
    Object.defineProperty(LinearReference.prototype, "endDistancePresent", {
        get: $util.oneOfGetter($oneOfFields = ["endDistance"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Creates a new LinearReference instance using the specified properties.
     * @function create
     * @memberof LinearReference
     * @static
     * @param {ILinearReference=} [properties] Properties to set
     * @returns {LinearReference} LinearReference instance
     */
    LinearReference.create = function create(properties) {
        return new LinearReference(properties);
    };

    /**
     * Encodes the specified LinearReference message. Does not implicitly {@link LinearReference.verify|verify} messages.
     * @function encode
     * @memberof LinearReference
     * @static
     * @param {ILinearReference} message LinearReference message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    LinearReference.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.startDistance != null && message.hasOwnProperty("startDistance"))
            writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.startDistance);
        if (message.endDistance != null && message.hasOwnProperty("endDistance"))
            writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.endDistance);
        return writer;
    };

    /**
     * Encodes the specified LinearReference message, length delimited. Does not implicitly {@link LinearReference.verify|verify} messages.
     * @function encodeDelimited
     * @memberof LinearReference
     * @static
     * @param {ILinearReference} message LinearReference message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    LinearReference.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a LinearReference message from the specified reader or buffer.
     * @function decode
     * @memberof LinearReference
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {LinearReference} LinearReference
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    LinearReference.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.LinearReference();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.startDistance = reader.uint64();
                break;
            case 2:
                message.endDistance = reader.uint64();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a LinearReference message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof LinearReference
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {LinearReference} LinearReference
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    LinearReference.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a LinearReference message.
     * @function verify
     * @memberof LinearReference
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    LinearReference.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        var properties = {};
        if (message.startDistance != null && message.hasOwnProperty("startDistance"))
            if (!$util.isInteger(message.startDistance) && !(message.startDistance && $util.isInteger(message.startDistance.low) && $util.isInteger(message.startDistance.high)))
                return "startDistance: integer|Long expected";
        if (message.endDistance != null && message.hasOwnProperty("endDistance")) {
            properties.endDistancePresent = 1;
            if (!$util.isInteger(message.endDistance) && !(message.endDistance && $util.isInteger(message.endDistance.low) && $util.isInteger(message.endDistance.high)))
                return "endDistance: integer|Long expected";
        }
        return null;
    };

    /**
     * Creates a LinearReference message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof LinearReference
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {LinearReference} LinearReference
     */
    LinearReference.fromObject = function fromObject(object) {
        if (object instanceof $root.LinearReference)
            return object;
        var message = new $root.LinearReference();
        if (object.startDistance != null)
            if ($util.Long)
                (message.startDistance = $util.Long.fromValue(object.startDistance)).unsigned = true;
            else if (typeof object.startDistance === "string")
                message.startDistance = parseInt(object.startDistance, 10);
            else if (typeof object.startDistance === "number")
                message.startDistance = object.startDistance;
            else if (typeof object.startDistance === "object")
                message.startDistance = new $util.LongBits(object.startDistance.low >>> 0, object.startDistance.high >>> 0).toNumber(true);
        if (object.endDistance != null)
            if ($util.Long)
                (message.endDistance = $util.Long.fromValue(object.endDistance)).unsigned = true;
            else if (typeof object.endDistance === "string")
                message.endDistance = parseInt(object.endDistance, 10);
            else if (typeof object.endDistance === "number")
                message.endDistance = object.endDistance;
            else if (typeof object.endDistance === "object")
                message.endDistance = new $util.LongBits(object.endDistance.low >>> 0, object.endDistance.high >>> 0).toNumber(true);
        return message;
    };

    /**
     * Creates a plain object from a LinearReference message. Also converts values to other types if specified.
     * @function toObject
     * @memberof LinearReference
     * @static
     * @param {LinearReference} message LinearReference
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    LinearReference.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults)
            if ($util.Long) {
                var long = new $util.Long(0, 0, true);
                object.startDistance = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
            } else
                object.startDistance = options.longs === String ? "0" : 0;
        if (message.startDistance != null && message.hasOwnProperty("startDistance"))
            if (typeof message.startDistance === "number")
                object.startDistance = options.longs === String ? String(message.startDistance) : message.startDistance;
            else
                object.startDistance = options.longs === String ? $util.Long.prototype.toString.call(message.startDistance) : options.longs === Number ? new $util.LongBits(message.startDistance.low >>> 0, message.startDistance.high >>> 0).toNumber(true) : message.startDistance;
        if (message.endDistance != null && message.hasOwnProperty("endDistance")) {
            if (typeof message.endDistance === "number")
                object.endDistance = options.longs === String ? String(message.endDistance) : message.endDistance;
            else
                object.endDistance = options.longs === String ? $util.Long.prototype.toString.call(message.endDistance) : options.longs === Number ? new $util.LongBits(message.endDistance.low >>> 0, message.endDistance.high >>> 0).toNumber(true) : message.endDistance;
            if (options.oneofs)
                object.endDistancePresent = "endDistance";
        }
        return object;
    };

    /**
     * Converts this LinearReference to JSON.
     * @function toJSON
     * @memberof LinearReference
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    LinearReference.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return LinearReference;
})();

$root.SharedStreetsLinearReferences = (function() {

    /**
     * Properties of a SharedStreetsLinearReferences.
     * @exports ISharedStreetsLinearReferences
     * @interface ISharedStreetsLinearReferences
     * @property {string|null} [referenceId] SharedStreetsLinearReferences referenceId
     * @property {number|Long|null} [referenceLength] SharedStreetsLinearReferences referenceLength
     * @property {Array.<ILinearReference>|null} [references] SharedStreetsLinearReferences references
     */

    /**
     * Constructs a new SharedStreetsLinearReferences.
     * @exports SharedStreetsLinearReferences
     * @classdesc Represents a SharedStreetsLinearReferences.
     * @implements ISharedStreetsLinearReferences
     * @constructor
     * @param {ISharedStreetsLinearReferences=} [properties] Properties to set
     */
    function SharedStreetsLinearReferences(properties) {
        this.references = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * SharedStreetsLinearReferences referenceId.
     * @member {string} referenceId
     * @memberof SharedStreetsLinearReferences
     * @instance
     */
    SharedStreetsLinearReferences.prototype.referenceId = "";

    /**
     * SharedStreetsLinearReferences referenceLength.
     * @member {number|Long} referenceLength
     * @memberof SharedStreetsLinearReferences
     * @instance
     */
    SharedStreetsLinearReferences.prototype.referenceLength = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * SharedStreetsLinearReferences references.
     * @member {Array.<ILinearReference>} references
     * @memberof SharedStreetsLinearReferences
     * @instance
     */
    SharedStreetsLinearReferences.prototype.references = $util.emptyArray;

    /**
     * Creates a new SharedStreetsLinearReferences instance using the specified properties.
     * @function create
     * @memberof SharedStreetsLinearReferences
     * @static
     * @param {ISharedStreetsLinearReferences=} [properties] Properties to set
     * @returns {SharedStreetsLinearReferences} SharedStreetsLinearReferences instance
     */
    SharedStreetsLinearReferences.create = function create(properties) {
        return new SharedStreetsLinearReferences(properties);
    };

    /**
     * Encodes the specified SharedStreetsLinearReferences message. Does not implicitly {@link SharedStreetsLinearReferences.verify|verify} messages.
     * @function encode
     * @memberof SharedStreetsLinearReferences
     * @static
     * @param {ISharedStreetsLinearReferences} message SharedStreetsLinearReferences message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SharedStreetsLinearReferences.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.referenceId != null && message.hasOwnProperty("referenceId"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.referenceId);
        if (message.referenceLength != null && message.hasOwnProperty("referenceLength"))
            writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.referenceLength);
        if (message.references != null && message.references.length)
            for (var i = 0; i < message.references.length; ++i)
                $root.LinearReference.encode(message.references[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified SharedStreetsLinearReferences message, length delimited. Does not implicitly {@link SharedStreetsLinearReferences.verify|verify} messages.
     * @function encodeDelimited
     * @memberof SharedStreetsLinearReferences
     * @static
     * @param {ISharedStreetsLinearReferences} message SharedStreetsLinearReferences message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SharedStreetsLinearReferences.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a SharedStreetsLinearReferences message from the specified reader or buffer.
     * @function decode
     * @memberof SharedStreetsLinearReferences
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {SharedStreetsLinearReferences} SharedStreetsLinearReferences
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SharedStreetsLinearReferences.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.SharedStreetsLinearReferences();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.referenceId = reader.string();
                break;
            case 2:
                message.referenceLength = reader.uint64();
                break;
            case 3:
                if (!(message.references && message.references.length))
                    message.references = [];
                message.references.push($root.LinearReference.decode(reader, reader.uint32()));
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a SharedStreetsLinearReferences message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof SharedStreetsLinearReferences
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {SharedStreetsLinearReferences} SharedStreetsLinearReferences
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SharedStreetsLinearReferences.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a SharedStreetsLinearReferences message.
     * @function verify
     * @memberof SharedStreetsLinearReferences
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    SharedStreetsLinearReferences.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.referenceId != null && message.hasOwnProperty("referenceId"))
            if (!$util.isString(message.referenceId))
                return "referenceId: string expected";
        if (message.referenceLength != null && message.hasOwnProperty("referenceLength"))
            if (!$util.isInteger(message.referenceLength) && !(message.referenceLength && $util.isInteger(message.referenceLength.low) && $util.isInteger(message.referenceLength.high)))
                return "referenceLength: integer|Long expected";
        if (message.references != null && message.hasOwnProperty("references")) {
            if (!Array.isArray(message.references))
                return "references: array expected";
            for (var i = 0; i < message.references.length; ++i) {
                var error = $root.LinearReference.verify(message.references[i]);
                if (error)
                    return "references." + error;
            }
        }
        return null;
    };

    /**
     * Creates a SharedStreetsLinearReferences message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof SharedStreetsLinearReferences
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {SharedStreetsLinearReferences} SharedStreetsLinearReferences
     */
    SharedStreetsLinearReferences.fromObject = function fromObject(object) {
        if (object instanceof $root.SharedStreetsLinearReferences)
            return object;
        var message = new $root.SharedStreetsLinearReferences();
        if (object.referenceId != null)
            message.referenceId = String(object.referenceId);
        if (object.referenceLength != null)
            if ($util.Long)
                (message.referenceLength = $util.Long.fromValue(object.referenceLength)).unsigned = true;
            else if (typeof object.referenceLength === "string")
                message.referenceLength = parseInt(object.referenceLength, 10);
            else if (typeof object.referenceLength === "number")
                message.referenceLength = object.referenceLength;
            else if (typeof object.referenceLength === "object")
                message.referenceLength = new $util.LongBits(object.referenceLength.low >>> 0, object.referenceLength.high >>> 0).toNumber(true);
        if (object.references) {
            if (!Array.isArray(object.references))
                throw TypeError(".SharedStreetsLinearReferences.references: array expected");
            message.references = [];
            for (var i = 0; i < object.references.length; ++i) {
                if (typeof object.references[i] !== "object")
                    throw TypeError(".SharedStreetsLinearReferences.references: object expected");
                message.references[i] = $root.LinearReference.fromObject(object.references[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a SharedStreetsLinearReferences message. Also converts values to other types if specified.
     * @function toObject
     * @memberof SharedStreetsLinearReferences
     * @static
     * @param {SharedStreetsLinearReferences} message SharedStreetsLinearReferences
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    SharedStreetsLinearReferences.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults)
            object.references = [];
        if (options.defaults) {
            object.referenceId = "";
            if ($util.Long) {
                var long = new $util.Long(0, 0, true);
                object.referenceLength = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
            } else
                object.referenceLength = options.longs === String ? "0" : 0;
        }
        if (message.referenceId != null && message.hasOwnProperty("referenceId"))
            object.referenceId = message.referenceId;
        if (message.referenceLength != null && message.hasOwnProperty("referenceLength"))
            if (typeof message.referenceLength === "number")
                object.referenceLength = options.longs === String ? String(message.referenceLength) : message.referenceLength;
            else
                object.referenceLength = options.longs === String ? $util.Long.prototype.toString.call(message.referenceLength) : options.longs === Number ? new $util.LongBits(message.referenceLength.low >>> 0, message.referenceLength.high >>> 0).toNumber(true) : message.referenceLength;
        if (message.references && message.references.length) {
            object.references = [];
            for (var j = 0; j < message.references.length; ++j)
                object.references[j] = $root.LinearReference.toObject(message.references[j], options);
        }
        return object;
    };

    /**
     * Converts this SharedStreetsLinearReferences to JSON.
     * @function toJSON
     * @memberof SharedStreetsLinearReferences
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    SharedStreetsLinearReferences.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return SharedStreetsLinearReferences;
})();

$root.DataBin = (function() {

    /**
     * Properties of a DataBin.
     * @exports IDataBin
     * @interface IDataBin
     * @property {Array.<string>|null} [dataType] DataBin dataType
     * @property {Array.<number|Long>|null} [count] DataBin count
     * @property {Array.<number>|null} [value] DataBin value
     */

    /**
     * Constructs a new DataBin.
     * @exports DataBin
     * @classdesc Represents a DataBin.
     * @implements IDataBin
     * @constructor
     * @param {IDataBin=} [properties] Properties to set
     */
    function DataBin(properties) {
        this.dataType = [];
        this.count = [];
        this.value = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * DataBin dataType.
     * @member {Array.<string>} dataType
     * @memberof DataBin
     * @instance
     */
    DataBin.prototype.dataType = $util.emptyArray;

    /**
     * DataBin count.
     * @member {Array.<number|Long>} count
     * @memberof DataBin
     * @instance
     */
    DataBin.prototype.count = $util.emptyArray;

    /**
     * DataBin value.
     * @member {Array.<number>} value
     * @memberof DataBin
     * @instance
     */
    DataBin.prototype.value = $util.emptyArray;

    /**
     * Creates a new DataBin instance using the specified properties.
     * @function create
     * @memberof DataBin
     * @static
     * @param {IDataBin=} [properties] Properties to set
     * @returns {DataBin} DataBin instance
     */
    DataBin.create = function create(properties) {
        return new DataBin(properties);
    };

    /**
     * Encodes the specified DataBin message. Does not implicitly {@link DataBin.verify|verify} messages.
     * @function encode
     * @memberof DataBin
     * @static
     * @param {IDataBin} message DataBin message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    DataBin.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.dataType != null && message.dataType.length)
            for (var i = 0; i < message.dataType.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.dataType[i]);
        if (message.count != null && message.count.length) {
            writer.uint32(/* id 2, wireType 2 =*/18).fork();
            for (var i = 0; i < message.count.length; ++i)
                writer.uint64(message.count[i]);
            writer.ldelim();
        }
        if (message.value != null && message.value.length) {
            writer.uint32(/* id 3, wireType 2 =*/26).fork();
            for (var i = 0; i < message.value.length; ++i)
                writer.double(message.value[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified DataBin message, length delimited. Does not implicitly {@link DataBin.verify|verify} messages.
     * @function encodeDelimited
     * @memberof DataBin
     * @static
     * @param {IDataBin} message DataBin message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    DataBin.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a DataBin message from the specified reader or buffer.
     * @function decode
     * @memberof DataBin
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {DataBin} DataBin
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    DataBin.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.DataBin();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                if (!(message.dataType && message.dataType.length))
                    message.dataType = [];
                message.dataType.push(reader.string());
                break;
            case 2:
                if (!(message.count && message.count.length))
                    message.count = [];
                if ((tag & 7) === 2) {
                    var end2 = reader.uint32() + reader.pos;
                    while (reader.pos < end2)
                        message.count.push(reader.uint64());
                } else
                    message.count.push(reader.uint64());
                break;
            case 3:
                if (!(message.value && message.value.length))
                    message.value = [];
                if ((tag & 7) === 2) {
                    var end2 = reader.uint32() + reader.pos;
                    while (reader.pos < end2)
                        message.value.push(reader.double());
                } else
                    message.value.push(reader.double());
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a DataBin message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof DataBin
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {DataBin} DataBin
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    DataBin.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a DataBin message.
     * @function verify
     * @memberof DataBin
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    DataBin.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.dataType != null && message.hasOwnProperty("dataType")) {
            if (!Array.isArray(message.dataType))
                return "dataType: array expected";
            for (var i = 0; i < message.dataType.length; ++i)
                if (!$util.isString(message.dataType[i]))
                    return "dataType: string[] expected";
        }
        if (message.count != null && message.hasOwnProperty("count")) {
            if (!Array.isArray(message.count))
                return "count: array expected";
            for (var i = 0; i < message.count.length; ++i)
                if (!$util.isInteger(message.count[i]) && !(message.count[i] && $util.isInteger(message.count[i].low) && $util.isInteger(message.count[i].high)))
                    return "count: integer|Long[] expected";
        }
        if (message.value != null && message.hasOwnProperty("value")) {
            if (!Array.isArray(message.value))
                return "value: array expected";
            for (var i = 0; i < message.value.length; ++i)
                if (typeof message.value[i] !== "number")
                    return "value: number[] expected";
        }
        return null;
    };

    /**
     * Creates a DataBin message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof DataBin
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {DataBin} DataBin
     */
    DataBin.fromObject = function fromObject(object) {
        if (object instanceof $root.DataBin)
            return object;
        var message = new $root.DataBin();
        if (object.dataType) {
            if (!Array.isArray(object.dataType))
                throw TypeError(".DataBin.dataType: array expected");
            message.dataType = [];
            for (var i = 0; i < object.dataType.length; ++i)
                message.dataType[i] = String(object.dataType[i]);
        }
        if (object.count) {
            if (!Array.isArray(object.count))
                throw TypeError(".DataBin.count: array expected");
            message.count = [];
            for (var i = 0; i < object.count.length; ++i)
                if ($util.Long)
                    (message.count[i] = $util.Long.fromValue(object.count[i])).unsigned = true;
                else if (typeof object.count[i] === "string")
                    message.count[i] = parseInt(object.count[i], 10);
                else if (typeof object.count[i] === "number")
                    message.count[i] = object.count[i];
                else if (typeof object.count[i] === "object")
                    message.count[i] = new $util.LongBits(object.count[i].low >>> 0, object.count[i].high >>> 0).toNumber(true);
        }
        if (object.value) {
            if (!Array.isArray(object.value))
                throw TypeError(".DataBin.value: array expected");
            message.value = [];
            for (var i = 0; i < object.value.length; ++i)
                message.value[i] = Number(object.value[i]);
        }
        return message;
    };

    /**
     * Creates a plain object from a DataBin message. Also converts values to other types if specified.
     * @function toObject
     * @memberof DataBin
     * @static
     * @param {DataBin} message DataBin
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    DataBin.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults) {
            object.dataType = [];
            object.count = [];
            object.value = [];
        }
        if (message.dataType && message.dataType.length) {
            object.dataType = [];
            for (var j = 0; j < message.dataType.length; ++j)
                object.dataType[j] = message.dataType[j];
        }
        if (message.count && message.count.length) {
            object.count = [];
            for (var j = 0; j < message.count.length; ++j)
                if (typeof message.count[j] === "number")
                    object.count[j] = options.longs === String ? String(message.count[j]) : message.count[j];
                else
                    object.count[j] = options.longs === String ? $util.Long.prototype.toString.call(message.count[j]) : options.longs === Number ? new $util.LongBits(message.count[j].low >>> 0, message.count[j].high >>> 0).toNumber(true) : message.count[j];
        }
        if (message.value && message.value.length) {
            object.value = [];
            for (var j = 0; j < message.value.length; ++j)
                object.value[j] = options.json && !isFinite(message.value[j]) ? String(message.value[j]) : message.value[j];
        }
        return object;
    };

    /**
     * Converts this DataBin to JSON.
     * @function toJSON
     * @memberof DataBin
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    DataBin.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return DataBin;
})();

$root.BinnedPeriodicData = (function() {

    /**
     * Properties of a BinnedPeriodicData.
     * @exports IBinnedPeriodicData
     * @interface IBinnedPeriodicData
     * @property {Array.<number>|null} [periodOffset] BinnedPeriodicData periodOffset
     * @property {Array.<IDataBin>|null} [bins] BinnedPeriodicData bins
     */

    /**
     * Constructs a new BinnedPeriodicData.
     * @exports BinnedPeriodicData
     * @classdesc Represents a BinnedPeriodicData.
     * @implements IBinnedPeriodicData
     * @constructor
     * @param {IBinnedPeriodicData=} [properties] Properties to set
     */
    function BinnedPeriodicData(properties) {
        this.periodOffset = [];
        this.bins = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * BinnedPeriodicData periodOffset.
     * @member {Array.<number>} periodOffset
     * @memberof BinnedPeriodicData
     * @instance
     */
    BinnedPeriodicData.prototype.periodOffset = $util.emptyArray;

    /**
     * BinnedPeriodicData bins.
     * @member {Array.<IDataBin>} bins
     * @memberof BinnedPeriodicData
     * @instance
     */
    BinnedPeriodicData.prototype.bins = $util.emptyArray;

    /**
     * Creates a new BinnedPeriodicData instance using the specified properties.
     * @function create
     * @memberof BinnedPeriodicData
     * @static
     * @param {IBinnedPeriodicData=} [properties] Properties to set
     * @returns {BinnedPeriodicData} BinnedPeriodicData instance
     */
    BinnedPeriodicData.create = function create(properties) {
        return new BinnedPeriodicData(properties);
    };

    /**
     * Encodes the specified BinnedPeriodicData message. Does not implicitly {@link BinnedPeriodicData.verify|verify} messages.
     * @function encode
     * @memberof BinnedPeriodicData
     * @static
     * @param {IBinnedPeriodicData} message BinnedPeriodicData message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    BinnedPeriodicData.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.periodOffset != null && message.periodOffset.length) {
            writer.uint32(/* id 1, wireType 2 =*/10).fork();
            for (var i = 0; i < message.periodOffset.length; ++i)
                writer.uint32(message.periodOffset[i]);
            writer.ldelim();
        }
        if (message.bins != null && message.bins.length)
            for (var i = 0; i < message.bins.length; ++i)
                $root.DataBin.encode(message.bins[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified BinnedPeriodicData message, length delimited. Does not implicitly {@link BinnedPeriodicData.verify|verify} messages.
     * @function encodeDelimited
     * @memberof BinnedPeriodicData
     * @static
     * @param {IBinnedPeriodicData} message BinnedPeriodicData message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    BinnedPeriodicData.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a BinnedPeriodicData message from the specified reader or buffer.
     * @function decode
     * @memberof BinnedPeriodicData
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {BinnedPeriodicData} BinnedPeriodicData
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    BinnedPeriodicData.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.BinnedPeriodicData();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                if (!(message.periodOffset && message.periodOffset.length))
                    message.periodOffset = [];
                if ((tag & 7) === 2) {
                    var end2 = reader.uint32() + reader.pos;
                    while (reader.pos < end2)
                        message.periodOffset.push(reader.uint32());
                } else
                    message.periodOffset.push(reader.uint32());
                break;
            case 2:
                if (!(message.bins && message.bins.length))
                    message.bins = [];
                message.bins.push($root.DataBin.decode(reader, reader.uint32()));
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a BinnedPeriodicData message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof BinnedPeriodicData
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {BinnedPeriodicData} BinnedPeriodicData
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    BinnedPeriodicData.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a BinnedPeriodicData message.
     * @function verify
     * @memberof BinnedPeriodicData
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    BinnedPeriodicData.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.periodOffset != null && message.hasOwnProperty("periodOffset")) {
            if (!Array.isArray(message.periodOffset))
                return "periodOffset: array expected";
            for (var i = 0; i < message.periodOffset.length; ++i)
                if (!$util.isInteger(message.periodOffset[i]))
                    return "periodOffset: integer[] expected";
        }
        if (message.bins != null && message.hasOwnProperty("bins")) {
            if (!Array.isArray(message.bins))
                return "bins: array expected";
            for (var i = 0; i < message.bins.length; ++i) {
                var error = $root.DataBin.verify(message.bins[i]);
                if (error)
                    return "bins." + error;
            }
        }
        return null;
    };

    /**
     * Creates a BinnedPeriodicData message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof BinnedPeriodicData
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {BinnedPeriodicData} BinnedPeriodicData
     */
    BinnedPeriodicData.fromObject = function fromObject(object) {
        if (object instanceof $root.BinnedPeriodicData)
            return object;
        var message = new $root.BinnedPeriodicData();
        if (object.periodOffset) {
            if (!Array.isArray(object.periodOffset))
                throw TypeError(".BinnedPeriodicData.periodOffset: array expected");
            message.periodOffset = [];
            for (var i = 0; i < object.periodOffset.length; ++i)
                message.periodOffset[i] = object.periodOffset[i] >>> 0;
        }
        if (object.bins) {
            if (!Array.isArray(object.bins))
                throw TypeError(".BinnedPeriodicData.bins: array expected");
            message.bins = [];
            for (var i = 0; i < object.bins.length; ++i) {
                if (typeof object.bins[i] !== "object")
                    throw TypeError(".BinnedPeriodicData.bins: object expected");
                message.bins[i] = $root.DataBin.fromObject(object.bins[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a BinnedPeriodicData message. Also converts values to other types if specified.
     * @function toObject
     * @memberof BinnedPeriodicData
     * @static
     * @param {BinnedPeriodicData} message BinnedPeriodicData
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    BinnedPeriodicData.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults) {
            object.periodOffset = [];
            object.bins = [];
        }
        if (message.periodOffset && message.periodOffset.length) {
            object.periodOffset = [];
            for (var j = 0; j < message.periodOffset.length; ++j)
                object.periodOffset[j] = message.periodOffset[j];
        }
        if (message.bins && message.bins.length) {
            object.bins = [];
            for (var j = 0; j < message.bins.length; ++j)
                object.bins[j] = $root.DataBin.toObject(message.bins[j], options);
        }
        return object;
    };

    /**
     * Converts this BinnedPeriodicData to JSON.
     * @function toJSON
     * @memberof BinnedPeriodicData
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    BinnedPeriodicData.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return BinnedPeriodicData;
})();

$root.SharedStreetsBinnedLinearReferences = (function() {

    /**
     * Properties of a SharedStreetsBinnedLinearReferences.
     * @exports ISharedStreetsBinnedLinearReferences
     * @interface ISharedStreetsBinnedLinearReferences
     * @property {string|null} [referenceId] SharedStreetsBinnedLinearReferences referenceId
     * @property {boolean|null} [scaledCounts] SharedStreetsBinnedLinearReferences scaledCounts
     * @property {number|Long|null} [referenceLength] SharedStreetsBinnedLinearReferences referenceLength
     * @property {number|null} [numberOfBins] SharedStreetsBinnedLinearReferences numberOfBins
     * @property {Array.<number>|null} [binPosition] SharedStreetsBinnedLinearReferences binPosition
     * @property {Array.<IDataBin>|null} [bins] SharedStreetsBinnedLinearReferences bins
     */

    /**
     * Constructs a new SharedStreetsBinnedLinearReferences.
     * @exports SharedStreetsBinnedLinearReferences
     * @classdesc Represents a SharedStreetsBinnedLinearReferences.
     * @implements ISharedStreetsBinnedLinearReferences
     * @constructor
     * @param {ISharedStreetsBinnedLinearReferences=} [properties] Properties to set
     */
    function SharedStreetsBinnedLinearReferences(properties) {
        this.binPosition = [];
        this.bins = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * SharedStreetsBinnedLinearReferences referenceId.
     * @member {string} referenceId
     * @memberof SharedStreetsBinnedLinearReferences
     * @instance
     */
    SharedStreetsBinnedLinearReferences.prototype.referenceId = "";

    /**
     * SharedStreetsBinnedLinearReferences scaledCounts.
     * @member {boolean} scaledCounts
     * @memberof SharedStreetsBinnedLinearReferences
     * @instance
     */
    SharedStreetsBinnedLinearReferences.prototype.scaledCounts = false;

    /**
     * SharedStreetsBinnedLinearReferences referenceLength.
     * @member {number|Long} referenceLength
     * @memberof SharedStreetsBinnedLinearReferences
     * @instance
     */
    SharedStreetsBinnedLinearReferences.prototype.referenceLength = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * SharedStreetsBinnedLinearReferences numberOfBins.
     * @member {number} numberOfBins
     * @memberof SharedStreetsBinnedLinearReferences
     * @instance
     */
    SharedStreetsBinnedLinearReferences.prototype.numberOfBins = 0;

    /**
     * SharedStreetsBinnedLinearReferences binPosition.
     * @member {Array.<number>} binPosition
     * @memberof SharedStreetsBinnedLinearReferences
     * @instance
     */
    SharedStreetsBinnedLinearReferences.prototype.binPosition = $util.emptyArray;

    /**
     * SharedStreetsBinnedLinearReferences bins.
     * @member {Array.<IDataBin>} bins
     * @memberof SharedStreetsBinnedLinearReferences
     * @instance
     */
    SharedStreetsBinnedLinearReferences.prototype.bins = $util.emptyArray;

    /**
     * Creates a new SharedStreetsBinnedLinearReferences instance using the specified properties.
     * @function create
     * @memberof SharedStreetsBinnedLinearReferences
     * @static
     * @param {ISharedStreetsBinnedLinearReferences=} [properties] Properties to set
     * @returns {SharedStreetsBinnedLinearReferences} SharedStreetsBinnedLinearReferences instance
     */
    SharedStreetsBinnedLinearReferences.create = function create(properties) {
        return new SharedStreetsBinnedLinearReferences(properties);
    };

    /**
     * Encodes the specified SharedStreetsBinnedLinearReferences message. Does not implicitly {@link SharedStreetsBinnedLinearReferences.verify|verify} messages.
     * @function encode
     * @memberof SharedStreetsBinnedLinearReferences
     * @static
     * @param {ISharedStreetsBinnedLinearReferences} message SharedStreetsBinnedLinearReferences message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SharedStreetsBinnedLinearReferences.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.referenceId != null && message.hasOwnProperty("referenceId"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.referenceId);
        if (message.scaledCounts != null && message.hasOwnProperty("scaledCounts"))
            writer.uint32(/* id 2, wireType 0 =*/16).bool(message.scaledCounts);
        if (message.referenceLength != null && message.hasOwnProperty("referenceLength"))
            writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.referenceLength);
        if (message.numberOfBins != null && message.hasOwnProperty("numberOfBins"))
            writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.numberOfBins);
        if (message.binPosition != null && message.binPosition.length) {
            writer.uint32(/* id 5, wireType 2 =*/42).fork();
            for (var i = 0; i < message.binPosition.length; ++i)
                writer.uint32(message.binPosition[i]);
            writer.ldelim();
        }
        if (message.bins != null && message.bins.length)
            for (var i = 0; i < message.bins.length; ++i)
                $root.DataBin.encode(message.bins[i], writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified SharedStreetsBinnedLinearReferences message, length delimited. Does not implicitly {@link SharedStreetsBinnedLinearReferences.verify|verify} messages.
     * @function encodeDelimited
     * @memberof SharedStreetsBinnedLinearReferences
     * @static
     * @param {ISharedStreetsBinnedLinearReferences} message SharedStreetsBinnedLinearReferences message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SharedStreetsBinnedLinearReferences.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a SharedStreetsBinnedLinearReferences message from the specified reader or buffer.
     * @function decode
     * @memberof SharedStreetsBinnedLinearReferences
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {SharedStreetsBinnedLinearReferences} SharedStreetsBinnedLinearReferences
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SharedStreetsBinnedLinearReferences.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.SharedStreetsBinnedLinearReferences();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.referenceId = reader.string();
                break;
            case 2:
                message.scaledCounts = reader.bool();
                break;
            case 3:
                message.referenceLength = reader.uint64();
                break;
            case 4:
                message.numberOfBins = reader.uint32();
                break;
            case 5:
                if (!(message.binPosition && message.binPosition.length))
                    message.binPosition = [];
                if ((tag & 7) === 2) {
                    var end2 = reader.uint32() + reader.pos;
                    while (reader.pos < end2)
                        message.binPosition.push(reader.uint32());
                } else
                    message.binPosition.push(reader.uint32());
                break;
            case 6:
                if (!(message.bins && message.bins.length))
                    message.bins = [];
                message.bins.push($root.DataBin.decode(reader, reader.uint32()));
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a SharedStreetsBinnedLinearReferences message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof SharedStreetsBinnedLinearReferences
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {SharedStreetsBinnedLinearReferences} SharedStreetsBinnedLinearReferences
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SharedStreetsBinnedLinearReferences.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a SharedStreetsBinnedLinearReferences message.
     * @function verify
     * @memberof SharedStreetsBinnedLinearReferences
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    SharedStreetsBinnedLinearReferences.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.referenceId != null && message.hasOwnProperty("referenceId"))
            if (!$util.isString(message.referenceId))
                return "referenceId: string expected";
        if (message.scaledCounts != null && message.hasOwnProperty("scaledCounts"))
            if (typeof message.scaledCounts !== "boolean")
                return "scaledCounts: boolean expected";
        if (message.referenceLength != null && message.hasOwnProperty("referenceLength"))
            if (!$util.isInteger(message.referenceLength) && !(message.referenceLength && $util.isInteger(message.referenceLength.low) && $util.isInteger(message.referenceLength.high)))
                return "referenceLength: integer|Long expected";
        if (message.numberOfBins != null && message.hasOwnProperty("numberOfBins"))
            if (!$util.isInteger(message.numberOfBins))
                return "numberOfBins: integer expected";
        if (message.binPosition != null && message.hasOwnProperty("binPosition")) {
            if (!Array.isArray(message.binPosition))
                return "binPosition: array expected";
            for (var i = 0; i < message.binPosition.length; ++i)
                if (!$util.isInteger(message.binPosition[i]))
                    return "binPosition: integer[] expected";
        }
        if (message.bins != null && message.hasOwnProperty("bins")) {
            if (!Array.isArray(message.bins))
                return "bins: array expected";
            for (var i = 0; i < message.bins.length; ++i) {
                var error = $root.DataBin.verify(message.bins[i]);
                if (error)
                    return "bins." + error;
            }
        }
        return null;
    };

    /**
     * Creates a SharedStreetsBinnedLinearReferences message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof SharedStreetsBinnedLinearReferences
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {SharedStreetsBinnedLinearReferences} SharedStreetsBinnedLinearReferences
     */
    SharedStreetsBinnedLinearReferences.fromObject = function fromObject(object) {
        if (object instanceof $root.SharedStreetsBinnedLinearReferences)
            return object;
        var message = new $root.SharedStreetsBinnedLinearReferences();
        if (object.referenceId != null)
            message.referenceId = String(object.referenceId);
        if (object.scaledCounts != null)
            message.scaledCounts = Boolean(object.scaledCounts);
        if (object.referenceLength != null)
            if ($util.Long)
                (message.referenceLength = $util.Long.fromValue(object.referenceLength)).unsigned = true;
            else if (typeof object.referenceLength === "string")
                message.referenceLength = parseInt(object.referenceLength, 10);
            else if (typeof object.referenceLength === "number")
                message.referenceLength = object.referenceLength;
            else if (typeof object.referenceLength === "object")
                message.referenceLength = new $util.LongBits(object.referenceLength.low >>> 0, object.referenceLength.high >>> 0).toNumber(true);
        if (object.numberOfBins != null)
            message.numberOfBins = object.numberOfBins >>> 0;
        if (object.binPosition) {
            if (!Array.isArray(object.binPosition))
                throw TypeError(".SharedStreetsBinnedLinearReferences.binPosition: array expected");
            message.binPosition = [];
            for (var i = 0; i < object.binPosition.length; ++i)
                message.binPosition[i] = object.binPosition[i] >>> 0;
        }
        if (object.bins) {
            if (!Array.isArray(object.bins))
                throw TypeError(".SharedStreetsBinnedLinearReferences.bins: array expected");
            message.bins = [];
            for (var i = 0; i < object.bins.length; ++i) {
                if (typeof object.bins[i] !== "object")
                    throw TypeError(".SharedStreetsBinnedLinearReferences.bins: object expected");
                message.bins[i] = $root.DataBin.fromObject(object.bins[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a SharedStreetsBinnedLinearReferences message. Also converts values to other types if specified.
     * @function toObject
     * @memberof SharedStreetsBinnedLinearReferences
     * @static
     * @param {SharedStreetsBinnedLinearReferences} message SharedStreetsBinnedLinearReferences
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    SharedStreetsBinnedLinearReferences.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults) {
            object.binPosition = [];
            object.bins = [];
        }
        if (options.defaults) {
            object.referenceId = "";
            object.scaledCounts = false;
            if ($util.Long) {
                var long = new $util.Long(0, 0, true);
                object.referenceLength = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
            } else
                object.referenceLength = options.longs === String ? "0" : 0;
            object.numberOfBins = 0;
        }
        if (message.referenceId != null && message.hasOwnProperty("referenceId"))
            object.referenceId = message.referenceId;
        if (message.scaledCounts != null && message.hasOwnProperty("scaledCounts"))
            object.scaledCounts = message.scaledCounts;
        if (message.referenceLength != null && message.hasOwnProperty("referenceLength"))
            if (typeof message.referenceLength === "number")
                object.referenceLength = options.longs === String ? String(message.referenceLength) : message.referenceLength;
            else
                object.referenceLength = options.longs === String ? $util.Long.prototype.toString.call(message.referenceLength) : options.longs === Number ? new $util.LongBits(message.referenceLength.low >>> 0, message.referenceLength.high >>> 0).toNumber(true) : message.referenceLength;
        if (message.numberOfBins != null && message.hasOwnProperty("numberOfBins"))
            object.numberOfBins = message.numberOfBins;
        if (message.binPosition && message.binPosition.length) {
            object.binPosition = [];
            for (var j = 0; j < message.binPosition.length; ++j)
                object.binPosition[j] = message.binPosition[j];
        }
        if (message.bins && message.bins.length) {
            object.bins = [];
            for (var j = 0; j < message.bins.length; ++j)
                object.bins[j] = $root.DataBin.toObject(message.bins[j], options);
        }
        return object;
    };

    /**
     * Converts this SharedStreetsBinnedLinearReferences to JSON.
     * @function toJSON
     * @memberof SharedStreetsBinnedLinearReferences
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    SharedStreetsBinnedLinearReferences.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return SharedStreetsBinnedLinearReferences;
})();

/**
 * PeriodSize enum.
 * @exports PeriodSize
 * @enum {string}
 * @property {number} OneSecond=0 OneSecond value
 * @property {number} FiveSeconds=1 FiveSeconds value
 * @property {number} TenSeconds=2 TenSeconds value
 * @property {number} FifteenSeconds=3 FifteenSeconds value
 * @property {number} ThirtySeconds=4 ThirtySeconds value
 * @property {number} OneMinute=5 OneMinute value
 * @property {number} FiveMinutes=6 FiveMinutes value
 * @property {number} TenMinutes=7 TenMinutes value
 * @property {number} FifteenMinutes=8 FifteenMinutes value
 * @property {number} ThirtyMinutes=9 ThirtyMinutes value
 * @property {number} OneHour=10 OneHour value
 * @property {number} OneDay=11 OneDay value
 * @property {number} OneWeek=12 OneWeek value
 * @property {number} OneMonth=13 OneMonth value
 * @property {number} OneYear=14 OneYear value
 */
$root.PeriodSize = (function() {
    var valuesById = {}, values = Object.create(valuesById);
    values[valuesById[0] = "OneSecond"] = 0;
    values[valuesById[1] = "FiveSeconds"] = 1;
    values[valuesById[2] = "TenSeconds"] = 2;
    values[valuesById[3] = "FifteenSeconds"] = 3;
    values[valuesById[4] = "ThirtySeconds"] = 4;
    values[valuesById[5] = "OneMinute"] = 5;
    values[valuesById[6] = "FiveMinutes"] = 6;
    values[valuesById[7] = "TenMinutes"] = 7;
    values[valuesById[8] = "FifteenMinutes"] = 8;
    values[valuesById[9] = "ThirtyMinutes"] = 9;
    values[valuesById[10] = "OneHour"] = 10;
    values[valuesById[11] = "OneDay"] = 11;
    values[valuesById[12] = "OneWeek"] = 12;
    values[valuesById[13] = "OneMonth"] = 13;
    values[valuesById[14] = "OneYear"] = 14;
    return values;
})();

$root.SharedStreetsWeeklyBinnedLinearReferences = (function() {

    /**
     * Properties of a SharedStreetsWeeklyBinnedLinearReferences.
     * @exports ISharedStreetsWeeklyBinnedLinearReferences
     * @interface ISharedStreetsWeeklyBinnedLinearReferences
     * @property {string|null} [referenceId] SharedStreetsWeeklyBinnedLinearReferences referenceId
     * @property {PeriodSize|null} [periodSize] SharedStreetsWeeklyBinnedLinearReferences periodSize
     * @property {boolean|null} [scaledCounts] SharedStreetsWeeklyBinnedLinearReferences scaledCounts
     * @property {number|Long|null} [referenceLength] SharedStreetsWeeklyBinnedLinearReferences referenceLength
     * @property {number|null} [numberOfBins] SharedStreetsWeeklyBinnedLinearReferences numberOfBins
     * @property {Array.<number>|null} [binPosition] SharedStreetsWeeklyBinnedLinearReferences binPosition
     * @property {Array.<IBinnedPeriodicData>|null} [binnedPeriodicData] SharedStreetsWeeklyBinnedLinearReferences binnedPeriodicData
     */

    /**
     * Constructs a new SharedStreetsWeeklyBinnedLinearReferences.
     * @exports SharedStreetsWeeklyBinnedLinearReferences
     * @classdesc Represents a SharedStreetsWeeklyBinnedLinearReferences.
     * @implements ISharedStreetsWeeklyBinnedLinearReferences
     * @constructor
     * @param {ISharedStreetsWeeklyBinnedLinearReferences=} [properties] Properties to set
     */
    function SharedStreetsWeeklyBinnedLinearReferences(properties) {
        this.binPosition = [];
        this.binnedPeriodicData = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * SharedStreetsWeeklyBinnedLinearReferences referenceId.
     * @member {string} referenceId
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @instance
     */
    SharedStreetsWeeklyBinnedLinearReferences.prototype.referenceId = "";

    /**
     * SharedStreetsWeeklyBinnedLinearReferences periodSize.
     * @member {PeriodSize} periodSize
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @instance
     */
    SharedStreetsWeeklyBinnedLinearReferences.prototype.periodSize = 0;

    /**
     * SharedStreetsWeeklyBinnedLinearReferences scaledCounts.
     * @member {boolean} scaledCounts
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @instance
     */
    SharedStreetsWeeklyBinnedLinearReferences.prototype.scaledCounts = false;

    /**
     * SharedStreetsWeeklyBinnedLinearReferences referenceLength.
     * @member {number|Long} referenceLength
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @instance
     */
    SharedStreetsWeeklyBinnedLinearReferences.prototype.referenceLength = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * SharedStreetsWeeklyBinnedLinearReferences numberOfBins.
     * @member {number} numberOfBins
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @instance
     */
    SharedStreetsWeeklyBinnedLinearReferences.prototype.numberOfBins = 0;

    /**
     * SharedStreetsWeeklyBinnedLinearReferences binPosition.
     * @member {Array.<number>} binPosition
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @instance
     */
    SharedStreetsWeeklyBinnedLinearReferences.prototype.binPosition = $util.emptyArray;

    /**
     * SharedStreetsWeeklyBinnedLinearReferences binnedPeriodicData.
     * @member {Array.<IBinnedPeriodicData>} binnedPeriodicData
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @instance
     */
    SharedStreetsWeeklyBinnedLinearReferences.prototype.binnedPeriodicData = $util.emptyArray;

    /**
     * Creates a new SharedStreetsWeeklyBinnedLinearReferences instance using the specified properties.
     * @function create
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @static
     * @param {ISharedStreetsWeeklyBinnedLinearReferences=} [properties] Properties to set
     * @returns {SharedStreetsWeeklyBinnedLinearReferences} SharedStreetsWeeklyBinnedLinearReferences instance
     */
    SharedStreetsWeeklyBinnedLinearReferences.create = function create(properties) {
        return new SharedStreetsWeeklyBinnedLinearReferences(properties);
    };

    /**
     * Encodes the specified SharedStreetsWeeklyBinnedLinearReferences message. Does not implicitly {@link SharedStreetsWeeklyBinnedLinearReferences.verify|verify} messages.
     * @function encode
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @static
     * @param {ISharedStreetsWeeklyBinnedLinearReferences} message SharedStreetsWeeklyBinnedLinearReferences message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SharedStreetsWeeklyBinnedLinearReferences.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.referenceId != null && message.hasOwnProperty("referenceId"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.referenceId);
        if (message.periodSize != null && message.hasOwnProperty("periodSize"))
            writer.uint32(/* id 2, wireType 0 =*/16).int32(message.periodSize);
        if (message.scaledCounts != null && message.hasOwnProperty("scaledCounts"))
            writer.uint32(/* id 3, wireType 0 =*/24).bool(message.scaledCounts);
        if (message.referenceLength != null && message.hasOwnProperty("referenceLength"))
            writer.uint32(/* id 4, wireType 0 =*/32).uint64(message.referenceLength);
        if (message.numberOfBins != null && message.hasOwnProperty("numberOfBins"))
            writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.numberOfBins);
        if (message.binPosition != null && message.binPosition.length) {
            writer.uint32(/* id 6, wireType 2 =*/50).fork();
            for (var i = 0; i < message.binPosition.length; ++i)
                writer.uint32(message.binPosition[i]);
            writer.ldelim();
        }
        if (message.binnedPeriodicData != null && message.binnedPeriodicData.length)
            for (var i = 0; i < message.binnedPeriodicData.length; ++i)
                $root.BinnedPeriodicData.encode(message.binnedPeriodicData[i], writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified SharedStreetsWeeklyBinnedLinearReferences message, length delimited. Does not implicitly {@link SharedStreetsWeeklyBinnedLinearReferences.verify|verify} messages.
     * @function encodeDelimited
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @static
     * @param {ISharedStreetsWeeklyBinnedLinearReferences} message SharedStreetsWeeklyBinnedLinearReferences message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SharedStreetsWeeklyBinnedLinearReferences.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a SharedStreetsWeeklyBinnedLinearReferences message from the specified reader or buffer.
     * @function decode
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {SharedStreetsWeeklyBinnedLinearReferences} SharedStreetsWeeklyBinnedLinearReferences
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SharedStreetsWeeklyBinnedLinearReferences.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.SharedStreetsWeeklyBinnedLinearReferences();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.referenceId = reader.string();
                break;
            case 2:
                message.periodSize = reader.int32();
                break;
            case 3:
                message.scaledCounts = reader.bool();
                break;
            case 4:
                message.referenceLength = reader.uint64();
                break;
            case 5:
                message.numberOfBins = reader.uint32();
                break;
            case 6:
                if (!(message.binPosition && message.binPosition.length))
                    message.binPosition = [];
                if ((tag & 7) === 2) {
                    var end2 = reader.uint32() + reader.pos;
                    while (reader.pos < end2)
                        message.binPosition.push(reader.uint32());
                } else
                    message.binPosition.push(reader.uint32());
                break;
            case 7:
                if (!(message.binnedPeriodicData && message.binnedPeriodicData.length))
                    message.binnedPeriodicData = [];
                message.binnedPeriodicData.push($root.BinnedPeriodicData.decode(reader, reader.uint32()));
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a SharedStreetsWeeklyBinnedLinearReferences message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {SharedStreetsWeeklyBinnedLinearReferences} SharedStreetsWeeklyBinnedLinearReferences
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SharedStreetsWeeklyBinnedLinearReferences.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a SharedStreetsWeeklyBinnedLinearReferences message.
     * @function verify
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    SharedStreetsWeeklyBinnedLinearReferences.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.referenceId != null && message.hasOwnProperty("referenceId"))
            if (!$util.isString(message.referenceId))
                return "referenceId: string expected";
        if (message.periodSize != null && message.hasOwnProperty("periodSize"))
            switch (message.periodSize) {
            default:
                return "periodSize: enum value expected";
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
                break;
            }
        if (message.scaledCounts != null && message.hasOwnProperty("scaledCounts"))
            if (typeof message.scaledCounts !== "boolean")
                return "scaledCounts: boolean expected";
        if (message.referenceLength != null && message.hasOwnProperty("referenceLength"))
            if (!$util.isInteger(message.referenceLength) && !(message.referenceLength && $util.isInteger(message.referenceLength.low) && $util.isInteger(message.referenceLength.high)))
                return "referenceLength: integer|Long expected";
        if (message.numberOfBins != null && message.hasOwnProperty("numberOfBins"))
            if (!$util.isInteger(message.numberOfBins))
                return "numberOfBins: integer expected";
        if (message.binPosition != null && message.hasOwnProperty("binPosition")) {
            if (!Array.isArray(message.binPosition))
                return "binPosition: array expected";
            for (var i = 0; i < message.binPosition.length; ++i)
                if (!$util.isInteger(message.binPosition[i]))
                    return "binPosition: integer[] expected";
        }
        if (message.binnedPeriodicData != null && message.hasOwnProperty("binnedPeriodicData")) {
            if (!Array.isArray(message.binnedPeriodicData))
                return "binnedPeriodicData: array expected";
            for (var i = 0; i < message.binnedPeriodicData.length; ++i) {
                var error = $root.BinnedPeriodicData.verify(message.binnedPeriodicData[i]);
                if (error)
                    return "binnedPeriodicData." + error;
            }
        }
        return null;
    };

    /**
     * Creates a SharedStreetsWeeklyBinnedLinearReferences message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {SharedStreetsWeeklyBinnedLinearReferences} SharedStreetsWeeklyBinnedLinearReferences
     */
    SharedStreetsWeeklyBinnedLinearReferences.fromObject = function fromObject(object) {
        if (object instanceof $root.SharedStreetsWeeklyBinnedLinearReferences)
            return object;
        var message = new $root.SharedStreetsWeeklyBinnedLinearReferences();
        if (object.referenceId != null)
            message.referenceId = String(object.referenceId);
        switch (object.periodSize) {
        case "OneSecond":
        case 0:
            message.periodSize = 0;
            break;
        case "FiveSeconds":
        case 1:
            message.periodSize = 1;
            break;
        case "TenSeconds":
        case 2:
            message.periodSize = 2;
            break;
        case "FifteenSeconds":
        case 3:
            message.periodSize = 3;
            break;
        case "ThirtySeconds":
        case 4:
            message.periodSize = 4;
            break;
        case "OneMinute":
        case 5:
            message.periodSize = 5;
            break;
        case "FiveMinutes":
        case 6:
            message.periodSize = 6;
            break;
        case "TenMinutes":
        case 7:
            message.periodSize = 7;
            break;
        case "FifteenMinutes":
        case 8:
            message.periodSize = 8;
            break;
        case "ThirtyMinutes":
        case 9:
            message.periodSize = 9;
            break;
        case "OneHour":
        case 10:
            message.periodSize = 10;
            break;
        case "OneDay":
        case 11:
            message.periodSize = 11;
            break;
        case "OneWeek":
        case 12:
            message.periodSize = 12;
            break;
        case "OneMonth":
        case 13:
            message.periodSize = 13;
            break;
        case "OneYear":
        case 14:
            message.periodSize = 14;
            break;
        }
        if (object.scaledCounts != null)
            message.scaledCounts = Boolean(object.scaledCounts);
        if (object.referenceLength != null)
            if ($util.Long)
                (message.referenceLength = $util.Long.fromValue(object.referenceLength)).unsigned = true;
            else if (typeof object.referenceLength === "string")
                message.referenceLength = parseInt(object.referenceLength, 10);
            else if (typeof object.referenceLength === "number")
                message.referenceLength = object.referenceLength;
            else if (typeof object.referenceLength === "object")
                message.referenceLength = new $util.LongBits(object.referenceLength.low >>> 0, object.referenceLength.high >>> 0).toNumber(true);
        if (object.numberOfBins != null)
            message.numberOfBins = object.numberOfBins >>> 0;
        if (object.binPosition) {
            if (!Array.isArray(object.binPosition))
                throw TypeError(".SharedStreetsWeeklyBinnedLinearReferences.binPosition: array expected");
            message.binPosition = [];
            for (var i = 0; i < object.binPosition.length; ++i)
                message.binPosition[i] = object.binPosition[i] >>> 0;
        }
        if (object.binnedPeriodicData) {
            if (!Array.isArray(object.binnedPeriodicData))
                throw TypeError(".SharedStreetsWeeklyBinnedLinearReferences.binnedPeriodicData: array expected");
            message.binnedPeriodicData = [];
            for (var i = 0; i < object.binnedPeriodicData.length; ++i) {
                if (typeof object.binnedPeriodicData[i] !== "object")
                    throw TypeError(".SharedStreetsWeeklyBinnedLinearReferences.binnedPeriodicData: object expected");
                message.binnedPeriodicData[i] = $root.BinnedPeriodicData.fromObject(object.binnedPeriodicData[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a SharedStreetsWeeklyBinnedLinearReferences message. Also converts values to other types if specified.
     * @function toObject
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @static
     * @param {SharedStreetsWeeklyBinnedLinearReferences} message SharedStreetsWeeklyBinnedLinearReferences
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    SharedStreetsWeeklyBinnedLinearReferences.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults) {
            object.binPosition = [];
            object.binnedPeriodicData = [];
        }
        if (options.defaults) {
            object.referenceId = "";
            object.periodSize = options.enums === String ? "OneSecond" : 0;
            object.scaledCounts = false;
            if ($util.Long) {
                var long = new $util.Long(0, 0, true);
                object.referenceLength = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
            } else
                object.referenceLength = options.longs === String ? "0" : 0;
            object.numberOfBins = 0;
        }
        if (message.referenceId != null && message.hasOwnProperty("referenceId"))
            object.referenceId = message.referenceId;
        if (message.periodSize != null && message.hasOwnProperty("periodSize"))
            object.periodSize = options.enums === String ? $root.PeriodSize[message.periodSize] : message.periodSize;
        if (message.scaledCounts != null && message.hasOwnProperty("scaledCounts"))
            object.scaledCounts = message.scaledCounts;
        if (message.referenceLength != null && message.hasOwnProperty("referenceLength"))
            if (typeof message.referenceLength === "number")
                object.referenceLength = options.longs === String ? String(message.referenceLength) : message.referenceLength;
            else
                object.referenceLength = options.longs === String ? $util.Long.prototype.toString.call(message.referenceLength) : options.longs === Number ? new $util.LongBits(message.referenceLength.low >>> 0, message.referenceLength.high >>> 0).toNumber(true) : message.referenceLength;
        if (message.numberOfBins != null && message.hasOwnProperty("numberOfBins"))
            object.numberOfBins = message.numberOfBins;
        if (message.binPosition && message.binPosition.length) {
            object.binPosition = [];
            for (var j = 0; j < message.binPosition.length; ++j)
                object.binPosition[j] = message.binPosition[j];
        }
        if (message.binnedPeriodicData && message.binnedPeriodicData.length) {
            object.binnedPeriodicData = [];
            for (var j = 0; j < message.binnedPeriodicData.length; ++j)
                object.binnedPeriodicData[j] = $root.BinnedPeriodicData.toObject(message.binnedPeriodicData[j], options);
        }
        return object;
    };

    /**
     * Converts this SharedStreetsWeeklyBinnedLinearReferences to JSON.
     * @function toJSON
     * @memberof SharedStreetsWeeklyBinnedLinearReferences
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    SharedStreetsWeeklyBinnedLinearReferences.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return SharedStreetsWeeklyBinnedLinearReferences;
})();

module.exports = $root;
