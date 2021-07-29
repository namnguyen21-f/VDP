import { segmentsFromTemplate } from './segment/segmentTemplate.js';
import { segmentsFromList } from './segment/segmentList.js';
import { segmentsFromBase } from './segment/segmentBase.js';
const isObject = (obj) => {
  return !!obj && typeof obj === 'object';
};

const merge = (...objects) => {
  
    return objects.reduce((result, source) => {
      if (typeof source !== 'object') { 
        return result;
      }
      Object.keys(source).forEach(key => {
        
        if (Array.isArray(result[key]) && Array.isArray(source[key])) {
          result[key] = result[key].concat(source[key]);
        } else if (isObject(result[key]) && isObject(source[key])) {
          result[key] = merge(result[key], source[key]);
        } else {
          
          result[key] = source[key];
        }
      });
      return result;
    }, {});
  };
  

export const generateSegments = ({ attributes, segmentInfo }) => {
  let segmentAttributes;
  let segmentsFn;
  if (segmentInfo.template) {
    segmentsFn = segmentsFromTemplate;
    segmentAttributes = merge(attributes, segmentInfo.template);
    if (segmentInfo.template.presentationTimeOffset) {
      segmentAttributes.presentationTimeOffset =
        segmentInfo.template.presentationTimeOffset / segmentInfo.template.timescale;
    }
  } else if (segmentInfo.base) {
    segmentsFn = segmentsFromBase;
    segmentAttributes = merge(attributes, segmentInfo.base);
  } else if (segmentInfo.list) {
    segmentsFn = segmentsFromList;
    segmentAttributes = merge(attributes, segmentInfo.list);
  }

  const segmentsInfo = {
    attributes
  };
  if (!segmentsFn) {
    return segmentsInfo;
  }

  const segments = segmentsFn(segmentAttributes, segmentInfo.timeline);
  // The @duration attribute will be used to determin the playlist's targetDuration which
  // must be in seconds. Since we've generated the segment list, we no longer need
  // @duration to be in @timescale units, so we can convert it here.

  if (segmentAttributes.duration) {
    const { duration, timescale = 1 } = segmentAttributes;

    segmentAttributes.duration = duration / timescale;
    
  } else if (segments.length) {
    // if there is no @duration attribute, use the largest segment duration as
    // as target duration
    segmentAttributes.duration = segments.reduce((max, segment) => {
      return Math.max(max, Math.ceil(segment.duration));
    }, 0);
  } else {
    segmentAttributes.duration = 0;
  }

  

  segmentsInfo.attributes = segmentAttributes;
  segmentsInfo.segments = segments;
 

  // This is a sidx box without actual segment information
  if (segmentInfo.base && segmentAttributes.indexRange) {
    segmentsInfo.sidx = segments[0];
    segmentsInfo.segments = [];
  }

  console.log(segmentsInfo);

  return segmentsInfo;
};

export const toPlaylists = (representations) => representations.map(generateSegments);