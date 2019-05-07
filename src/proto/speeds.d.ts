import * as $protobuf from "protobufjs";

/** PeriodSize enum. */
export enum PeriodSize {
    OneSecond = 0,
    FiveSeconds = 1,
    TenSeconds = 2,
    FifteenSeconds = 3,
    ThirtySeconds = 4,
    OneMinute = 5,
    FiveMinutes = 6,
    TenMinutes = 7,
    FifteenMinutes = 8,
    ThirtyMinutes = 9,
    OneHour = 10,
    OneDay = 11,
    OneWeek = 12,
    OneMonth = 13,
    OneYear = 14
}

/** Properties of a TemporalPeriod. */
export interface ITemporalPeriod {

    /** TemporalPeriod periodSize */
    periodSize?: (PeriodSize|null);

    /** TemporalPeriod periodOffset */
    periodOffset?: (number|Long|null);
}

/** Represents a TemporalPeriod. */
export class TemporalPeriod implements ITemporalPeriod {

    /**
     * Constructs a new TemporalPeriod.
     * @param [properties] Properties to set
     */
    constructor(properties?: ITemporalPeriod);

    /** TemporalPeriod periodSize. */
    public periodSize: PeriodSize;

    /** TemporalPeriod periodOffset. */
    public periodOffset: (number|Long);

    /**
     * Creates a new TemporalPeriod instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TemporalPeriod instance
     */
    public static create(properties?: ITemporalPeriod): TemporalPeriod;

    /**
     * Encodes the specified TemporalPeriod message. Does not implicitly {@link TemporalPeriod.verify|verify} messages.
     * @param message TemporalPeriod message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ITemporalPeriod, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified TemporalPeriod message, length delimited. Does not implicitly {@link TemporalPeriod.verify|verify} messages.
     * @param message TemporalPeriod message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ITemporalPeriod, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a TemporalPeriod message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TemporalPeriod
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): TemporalPeriod;

    /**
     * Decodes a TemporalPeriod message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TemporalPeriod
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): TemporalPeriod;

    /**
     * Verifies a TemporalPeriod message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a TemporalPeriod message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TemporalPeriod
     */
    public static fromObject(object: { [k: string]: any }): TemporalPeriod;

    /**
     * Creates a plain object from a TemporalPeriod message. Also converts values to other types if specified.
     * @param message TemporalPeriod
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: TemporalPeriod, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this TemporalPeriod to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of a WeeklyCycle. */
export interface IWeeklyCycle {

    /** WeeklyCycle year */
    year?: (number|null);

    /** WeeklyCycle month */
    month?: (number|null);

    /** WeeklyCycle day */
    day?: (number|null);

    /** WeeklyCycle periodSize */
    periodSize?: (PeriodSize|null);
}

/** Represents a WeeklyCycle. */
export class WeeklyCycle implements IWeeklyCycle {

    /**
     * Constructs a new WeeklyCycle.
     * @param [properties] Properties to set
     */
    constructor(properties?: IWeeklyCycle);

    /** WeeklyCycle year. */
    public year: number;

    /** WeeklyCycle month. */
    public month: number;

    /** WeeklyCycle day. */
    public day: number;

    /** WeeklyCycle periodSize. */
    public periodSize: PeriodSize;

    /**
     * Creates a new WeeklyCycle instance using the specified properties.
     * @param [properties] Properties to set
     * @returns WeeklyCycle instance
     */
    public static create(properties?: IWeeklyCycle): WeeklyCycle;

    /**
     * Encodes the specified WeeklyCycle message. Does not implicitly {@link WeeklyCycle.verify|verify} messages.
     * @param message WeeklyCycle message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IWeeklyCycle, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified WeeklyCycle message, length delimited. Does not implicitly {@link WeeklyCycle.verify|verify} messages.
     * @param message WeeklyCycle message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IWeeklyCycle, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a WeeklyCycle message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns WeeklyCycle
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): WeeklyCycle;

    /**
     * Decodes a WeeklyCycle message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns WeeklyCycle
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): WeeklyCycle;

    /**
     * Verifies a WeeklyCycle message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a WeeklyCycle message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns WeeklyCycle
     */
    public static fromObject(object: { [k: string]: any }): WeeklyCycle;

    /**
     * Creates a plain object from a WeeklyCycle message. Also converts values to other types if specified.
     * @param message WeeklyCycle
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: WeeklyCycle, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this WeeklyCycle to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of a SpeedHistogram. */
export interface ISpeedHistogram {

    /** SpeedHistogram speedBin */
    speedBin?: (number[]|null);

    /** SpeedHistogram observationCount */
    observationCount?: (number[]|null);
}

/** Represents a SpeedHistogram. */
export class SpeedHistogram implements ISpeedHistogram {

    /**
     * Constructs a new SpeedHistogram.
     * @param [properties] Properties to set
     */
    constructor(properties?: ISpeedHistogram);

    /** SpeedHistogram speedBin. */
    public speedBin: number[];

    /** SpeedHistogram observationCount. */
    public observationCount: number[];

    /**
     * Creates a new SpeedHistogram instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SpeedHistogram instance
     */
    public static create(properties?: ISpeedHistogram): SpeedHistogram;

    /**
     * Encodes the specified SpeedHistogram message. Does not implicitly {@link SpeedHistogram.verify|verify} messages.
     * @param message SpeedHistogram message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ISpeedHistogram, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified SpeedHistogram message, length delimited. Does not implicitly {@link SpeedHistogram.verify|verify} messages.
     * @param message SpeedHistogram message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ISpeedHistogram, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a SpeedHistogram message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SpeedHistogram
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): SpeedHistogram;

    /**
     * Decodes a SpeedHistogram message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SpeedHistogram
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): SpeedHistogram;

    /**
     * Verifies a SpeedHistogram message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a SpeedHistogram message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SpeedHistogram
     */
    public static fromObject(object: { [k: string]: any }): SpeedHistogram;

    /**
     * Creates a plain object from a SpeedHistogram message. Also converts values to other types if specified.
     * @param message SpeedHistogram
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: SpeedHistogram, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this SpeedHistogram to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of a SpeedHistogramByPeriod. */
export interface ISpeedHistogramByPeriod {

    /** SpeedHistogramByPeriod periodOffset */
    periodOffset?: (number[]|null);

    /** SpeedHistogramByPeriod histogram */
    histogram?: (ISpeedHistogram[]|null);
}

/** Represents a SpeedHistogramByPeriod. */
export class SpeedHistogramByPeriod implements ISpeedHistogramByPeriod {

    /**
     * Constructs a new SpeedHistogramByPeriod.
     * @param [properties] Properties to set
     */
    constructor(properties?: ISpeedHistogramByPeriod);

    /** SpeedHistogramByPeriod periodOffset. */
    public periodOffset: number[];

    /** SpeedHistogramByPeriod histogram. */
    public histogram: ISpeedHistogram[];

    /**
     * Creates a new SpeedHistogramByPeriod instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SpeedHistogramByPeriod instance
     */
    public static create(properties?: ISpeedHistogramByPeriod): SpeedHistogramByPeriod;

    /**
     * Encodes the specified SpeedHistogramByPeriod message. Does not implicitly {@link SpeedHistogramByPeriod.verify|verify} messages.
     * @param message SpeedHistogramByPeriod message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ISpeedHistogramByPeriod, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified SpeedHistogramByPeriod message, length delimited. Does not implicitly {@link SpeedHistogramByPeriod.verify|verify} messages.
     * @param message SpeedHistogramByPeriod message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ISpeedHistogramByPeriod, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a SpeedHistogramByPeriod message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SpeedHistogramByPeriod
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): SpeedHistogramByPeriod;

    /**
     * Decodes a SpeedHistogramByPeriod message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SpeedHistogramByPeriod
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): SpeedHistogramByPeriod;

    /**
     * Verifies a SpeedHistogramByPeriod message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a SpeedHistogramByPeriod message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SpeedHistogramByPeriod
     */
    public static fromObject(object: { [k: string]: any }): SpeedHistogramByPeriod;

    /**
     * Creates a plain object from a SpeedHistogramByPeriod message. Also converts values to other types if specified.
     * @param message SpeedHistogramByPeriod
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: SpeedHistogramByPeriod, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this SpeedHistogramByPeriod to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of a SpeedSummary. */
export interface ISpeedSummary {

    /** SpeedSummary meanSpead */
    meanSpead?: (number|null);

    /** SpeedSummary percentile */
    percentile?: (number[]|null);

    /** SpeedSummary observationCount */
    observationCount?: (number[]|null);
}

/** Represents a SpeedSummary. */
export class SpeedSummary implements ISpeedSummary {

    /**
     * Constructs a new SpeedSummary.
     * @param [properties] Properties to set
     */
    constructor(properties?: ISpeedSummary);

    /** SpeedSummary meanSpead. */
    public meanSpead: number;

    /** SpeedSummary percentile. */
    public percentile: number[];

    /** SpeedSummary observationCount. */
    public observationCount: number[];

    /**
     * Creates a new SpeedSummary instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SpeedSummary instance
     */
    public static create(properties?: ISpeedSummary): SpeedSummary;

    /**
     * Encodes the specified SpeedSummary message. Does not implicitly {@link SpeedSummary.verify|verify} messages.
     * @param message SpeedSummary message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ISpeedSummary, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified SpeedSummary message, length delimited. Does not implicitly {@link SpeedSummary.verify|verify} messages.
     * @param message SpeedSummary message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ISpeedSummary, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a SpeedSummary message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SpeedSummary
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): SpeedSummary;

    /**
     * Decodes a SpeedSummary message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SpeedSummary
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): SpeedSummary;

    /**
     * Verifies a SpeedSummary message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a SpeedSummary message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SpeedSummary
     */
    public static fromObject(object: { [k: string]: any }): SpeedSummary;

    /**
     * Creates a plain object from a SpeedSummary message. Also converts values to other types if specified.
     * @param message SpeedSummary
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: SpeedSummary, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this SpeedSummary to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of a SpeedSummaryByPeriod. */
export interface ISpeedSummaryByPeriod {

    /** SpeedSummaryByPeriod periodOffset */
    periodOffset?: (number[]|null);

    /** SpeedSummaryByPeriod speedSummary */
    speedSummary?: (ISpeedSummary[]|null);
}

/** Represents a SpeedSummaryByPeriod. */
export class SpeedSummaryByPeriod implements ISpeedSummaryByPeriod {

    /**
     * Constructs a new SpeedSummaryByPeriod.
     * @param [properties] Properties to set
     */
    constructor(properties?: ISpeedSummaryByPeriod);

    /** SpeedSummaryByPeriod periodOffset. */
    public periodOffset: number[];

    /** SpeedSummaryByPeriod speedSummary. */
    public speedSummary: ISpeedSummary[];

    /**
     * Creates a new SpeedSummaryByPeriod instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SpeedSummaryByPeriod instance
     */
    public static create(properties?: ISpeedSummaryByPeriod): SpeedSummaryByPeriod;

    /**
     * Encodes the specified SpeedSummaryByPeriod message. Does not implicitly {@link SpeedSummaryByPeriod.verify|verify} messages.
     * @param message SpeedSummaryByPeriod message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ISpeedSummaryByPeriod, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified SpeedSummaryByPeriod message, length delimited. Does not implicitly {@link SpeedSummaryByPeriod.verify|verify} messages.
     * @param message SpeedSummaryByPeriod message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ISpeedSummaryByPeriod, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a SpeedSummaryByPeriod message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SpeedSummaryByPeriod
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): SpeedSummaryByPeriod;

    /**
     * Decodes a SpeedSummaryByPeriod message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SpeedSummaryByPeriod
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): SpeedSummaryByPeriod;

    /**
     * Verifies a SpeedSummaryByPeriod message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a SpeedSummaryByPeriod message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SpeedSummaryByPeriod
     */
    public static fromObject(object: { [k: string]: any }): SpeedSummaryByPeriod;

    /**
     * Creates a plain object from a SpeedSummaryByPeriod message. Also converts values to other types if specified.
     * @param message SpeedSummaryByPeriod
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: SpeedSummaryByPeriod, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this SpeedSummaryByPeriod to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of a SharedStreetsWeeklySpeeds. */
export interface ISharedStreetsWeeklySpeeds {

    /** SharedStreetsWeeklySpeeds referenceId */
    referenceId?: (string|null);

    /** SharedStreetsWeeklySpeeds periodSize */
    periodSize?: (PeriodSize|null);

    /** SharedStreetsWeeklySpeeds scaledCounts */
    scaledCounts?: (boolean|null);

    /** SharedStreetsWeeklySpeeds referenceLength */
    referenceLength?: (number|Long|null);

    /** SharedStreetsWeeklySpeeds numberOfBins */
    numberOfBins?: (number|null);

    /** SharedStreetsWeeklySpeeds binPosition */
    binPosition?: (number[]|null);

    /** SharedStreetsWeeklySpeeds speedsByPeriod */
    speedsByPeriod?: (ISpeedHistogramByPeriod[]|null);

    /** SharedStreetsWeeklySpeeds speedSummaryByPeriod */
    speedSummaryByPeriod?: (ISpeedSummaryByPeriod[]|null);
}

/** Represents a SharedStreetsWeeklySpeeds. */
export class SharedStreetsWeeklySpeeds implements ISharedStreetsWeeklySpeeds {

    /**
     * Constructs a new SharedStreetsWeeklySpeeds.
     * @param [properties] Properties to set
     */
    constructor(properties?: ISharedStreetsWeeklySpeeds);

    /** SharedStreetsWeeklySpeeds referenceId. */
    public referenceId: string;

    /** SharedStreetsWeeklySpeeds periodSize. */
    public periodSize: PeriodSize;

    /** SharedStreetsWeeklySpeeds scaledCounts. */
    public scaledCounts: boolean;

    /** SharedStreetsWeeklySpeeds referenceLength. */
    public referenceLength: (number|Long);

    /** SharedStreetsWeeklySpeeds numberOfBins. */
    public numberOfBins: number;

    /** SharedStreetsWeeklySpeeds binPosition. */
    public binPosition: number[];

    /** SharedStreetsWeeklySpeeds speedsByPeriod. */
    public speedsByPeriod: ISpeedHistogramByPeriod[];

    /** SharedStreetsWeeklySpeeds speedSummaryByPeriod. */
    public speedSummaryByPeriod: ISpeedSummaryByPeriod[];

    /**
     * Creates a new SharedStreetsWeeklySpeeds instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SharedStreetsWeeklySpeeds instance
     */
    public static create(properties?: ISharedStreetsWeeklySpeeds): SharedStreetsWeeklySpeeds;

    /**
     * Encodes the specified SharedStreetsWeeklySpeeds message. Does not implicitly {@link SharedStreetsWeeklySpeeds.verify|verify} messages.
     * @param message SharedStreetsWeeklySpeeds message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ISharedStreetsWeeklySpeeds, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified SharedStreetsWeeklySpeeds message, length delimited. Does not implicitly {@link SharedStreetsWeeklySpeeds.verify|verify} messages.
     * @param message SharedStreetsWeeklySpeeds message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ISharedStreetsWeeklySpeeds, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a SharedStreetsWeeklySpeeds message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SharedStreetsWeeklySpeeds
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): SharedStreetsWeeklySpeeds;

    /**
     * Decodes a SharedStreetsWeeklySpeeds message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SharedStreetsWeeklySpeeds
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): SharedStreetsWeeklySpeeds;

    /**
     * Verifies a SharedStreetsWeeklySpeeds message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a SharedStreetsWeeklySpeeds message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SharedStreetsWeeklySpeeds
     */
    public static fromObject(object: { [k: string]: any }): SharedStreetsWeeklySpeeds;

    /**
     * Creates a plain object from a SharedStreetsWeeklySpeeds message. Also converts values to other types if specified.
     * @param message SharedStreetsWeeklySpeeds
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: SharedStreetsWeeklySpeeds, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this SharedStreetsWeeklySpeeds to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}
