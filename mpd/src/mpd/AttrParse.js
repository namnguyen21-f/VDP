
const from = list => {
    if (!list.length) {
        return [];
    }
    
    const result = [];
    
    for (let i = 0; i < list.length; i++) {
        result.push(list[i]);
    }
    
    return result;
    };

const parseDuration = (str) => {
    const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
    const SECONDS_IN_MONTH = 30 * 24 * 60 * 60;
    const SECONDS_IN_DAY = 24 * 60 * 60;
    const SECONDS_IN_HOUR = 60 * 60;
    const SECONDS_IN_MIN = 60;
  
    // P10Y10M10DT10H10M10.1S
    const durationRegex =
      /P(?:(\d*)Y)?(?:(\d*)M)?(?:(\d*)D)?(?:T(?:(\d*)H)?(?:(\d*)M)?(?:([\d.]*)S)?)?/;
    const match = durationRegex.exec(str);
  
    if (!match) {
      return 0;
    }
  
    const [year, month, day, hour, minute, second] = match.slice(1);
  
    return (parseFloat(year || 0) * SECONDS_IN_YEAR +
      parseFloat(month || 0) * SECONDS_IN_MONTH +
      parseFloat(day || 0) * SECONDS_IN_DAY +
      parseFloat(hour || 0) * SECONDS_IN_HOUR +
      parseFloat(minute || 0) * SECONDS_IN_MIN +
      parseFloat(second || 0));
};
  
const parseDate = (str) => {
    // Date format without timezone according to ISO 8601
    // YYY-MM-DDThh:mm:ss.ssssss
    const dateRegex = /^\d+-\d+-\d+T\d+:\d+:\d+(\.\d+)?$/;
  
    // If the date string does not specifiy a timezone, we must specifiy UTC. This is
    // expressed by ending with 'Z'
    if (dateRegex.test(str)) {
      str += 'Z';
    }
  
    return Date.parse(str);
};



export const parsers = {
    /**
     * Specifies the duration of the entire Media Presentation. Format is a duration string
     * as specified in ISO 8601
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The duration in seconds
     */
    mediaPresentationDuration(value) {
      return parseDuration(value);
    },
  
    /**
     * Specifies the Segment availability start time for all Segments referred to in this
     * MPD. For a dynamic manifest, it specifies the anchor for the earliest availability
     * time. Format is a date string as specified in ISO 8601
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The date as seconds from unix epoch
     */
    availabilityStartTime(value) {
      return parseDate(value) / 1000;
    },
  
    /**
     * Specifies the smallest period between potential changes to the MPD. Format is a
     * duration string as specified in ISO 8601
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The duration in seconds
     */
    minimumUpdatePeriod(value) {
      return parseDuration(value);
    },
  
    /**
     * Specifies the suggested presentation delay. Format is a
     * duration string as specified in ISO 8601
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The duration in seconds
     */
    suggestedPresentationDelay(value) {
      return parseDuration(value);
    },
  
    /**
     * specifices the type of mpd. Can be either "static" or "dynamic"
     *
     * @param {string} value
     *        value of attribute as a string
     *
     * @return {string}
     *         The type as a string
     */
    type(value) {
      return value;
    },
  
    /**
     * Specifies the duration of the smallest time shifting buffer for any Representation
     * in the MPD. Format is a duration string as specified in ISO 8601
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The duration in seconds
     */
    timeShiftBufferDepth(value) {
      return parseDuration(value);
    },
  
    /**
     * Specifies the PeriodStart time of the Period relative to the availabilityStarttime.
     * Format is a duration string as specified in ISO 8601
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The duration in seconds
     */
    start(value) {
      return parseDuration(value);
    },
  
    /**
     * Specifies the width of the visual presentation
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The parsed width
     */
    width(value) {
      return parseInt(value, 10);
    },
  
    /**
     * Specifies the height of the visual presentation
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The parsed height
     */
    height(value) {
      return parseInt(value, 10);
    },
  
    /**
     * Specifies the bitrate of the representation
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The parsed bandwidth
     */
    bandwidth(value) {
      return parseInt(value, 10);
    },
  
    /**
     * Specifies the number of the first Media Segment in this Representation in the Period
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The parsed number
     */
    startNumber(value) {
      return parseInt(value, 10);
    },
  
    /**
     * Specifies the timescale in units per seconds
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The parsed timescale
     */
    timescale(value) {
      return parseInt(value, 10);
    },
  
    /**
     * Specifies the presentationTimeOffset.
     *
     * @param {string} value
     *        value of the attribute as a string
     *
     * @return {number}
     *         The parsed presentationTimeOffset
     */
    presentationTimeOffset(value) {
      return parseInt(value, 10);
    },
  
    /**
     * Specifies the constant approximate Segment duration
     * NOTE: The <Period> element also contains an @duration attribute. This duration
     *       specifies the duration of the Period. This attribute is currently not
     *       supported by the rest of the parser, however we still check for it to prevent
     *       errors.
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The parsed duration
     */
    duration(value) {
      const parsedValue = parseInt(value, 10);
  
      if (isNaN(parsedValue)) {
        return parseDuration(value);
      }
  
      return parsedValue;
    },
  
    /**
     * Specifies the Segment duration, in units of the value of the @timescale.
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The parsed duration
     */
    d(value) {
      return parseInt(value, 10);
    },
  
    /**
     * Specifies the MPD start time, in @timescale units, the first Segment in the series
     * starts relative to the beginning of the Period
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The parsed time
     */
    t(value) {
      return parseInt(value, 10);
    },
  
    /**
     * Specifies the repeat count of the number of following contiguous Segments with the
     * same duration expressed by the value of @d
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {number}
     *         The parsed number
     */
    r(value) {
      return parseInt(value, 10);
    },
  
    /**
     * Default parser for all other attributes. Acts as a no-op and just returns the value
     * as a string
     *
     * @param {string} value
     *        value of attribute as a string
     * @return {string}
     *         Unparsed value
     */
    DEFAULT(value) {
      return value;
    }
};

