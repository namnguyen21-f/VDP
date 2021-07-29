//Import for parser
import {DOMParser} from 'xmldom';
import {parsers} from './AttrParse';
//import for resolve URL
import URLToolkit from 'url-toolkit';
import window from 'global/window';
import {toPlaylists} from './toPlaylist';
var DEFAULT_LOCATION = 'http://example.com';
//
var resolveUrl = function resolveUrl(baseUrl, relativeUrl) {
  
  // return early if we don't need to resolve
  if (/^[a-z]+:/i.test(relativeUrl)) {
    return relativeUrl;
  } // if baseUrl is a data URI, ignore it and resolve everything relative to window.location
  

  if (/^data:/.test(baseUrl)) {
    baseUrl = window.location && window.location.href || '';
  } // IE11 supports URL but not the URL constructor
  // feature detect the behavior we want
  var nativeURL = typeof window.URL === 'function';
  var protocolLess = /^\/\//.test(baseUrl); // remove location if window.location isn't available (i.e. we're in node)
  // and if baseUrl isn't an absolute url
  
  var removeLocation = !window.location && !/\/\//i.test(baseUrl); 
  // if the base URL is relative then combine with the current location
  if (nativeURL) {
    baseUrl = new window.URL(baseUrl, window.location || DEFAULT_LOCATION);
  } else if (!/\/\//i.test(baseUrl)) {
    baseUrl = URLToolkit.buildAbsoluteURL(window.location && window.location.href || '', baseUrl);
  }

  if (nativeURL) {
    var newUrl = new URL(relativeUrl, baseUrl); // if we're a protocol-less url, remove the protocol
    // and if we're location-less, remove the location
    // otherwise, return the url unmodified

    if (removeLocation) {
      return newUrl.href.slice(DEFAULT_LOCATION.length);
    } else if (protocolLess) {
      return newUrl.href.slice(newUrl.protocol.length);
    }

    return newUrl.href;
  }

  return URLToolkit.buildAbsoluteURL(baseUrl, relativeUrl);
};
const getContent = element => element.textContent.trim();
const range = (start, end) => {
    const result = [];
  
    for (let i = start; i < end; i++) {
      result.push(i);
    }
  
    return result;
  };
const flatten = lists => lists.reduce((x, y) => x.concat(y), []);
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
const findIndexes = (l, key) => l.reduce((a, e, i) => {
if (e[key]) {
    a.push(i);
}

return a;
}, []);

// parese attribute of MPD

const buildBaseUrls = (referenceUrls, baseUrlElements) => {
  if (!baseUrlElements.length) {
    return referenceUrls;
  }

  return flatten(referenceUrls.map(function(reference) {
    return baseUrlElements.map(function(baseUrlElement) {
      return resolveUrl(reference, getContent(baseUrlElement));
    });
  }));
};

//////
  
const findChildren = (element, name) => from(element.childNodes).filter(({tagName}) => tagName === name);

const stringToMpdXml = (manifestString) => {
  if (manifestString === '') {
    
  }
  const parser = new DOMParser();
  let xml;
  let mpd;
  try {
    xml = parser.parseFromString(manifestString, 'application/xml');
    mpd = xml && xml.documentElement.tagName === 'MPD' ?
    xml.documentElement : null;

  } catch (e) {
    // ie 11 throwsw on invalid xml
  }

  if (!mpd || mpd &&
      mpd.getElementsByTagName('parsererror').length > 0) {
   
  }

  return mpd;
};

const parseAttributes = (el) => {
    if (!(el && el.attributes)) {
      return {};
    }
  
    return from(el.attributes)
      .reduce((a, e) => {
        const parseFn = parsers[e.name] || parsers.DEFAULT;
        a[e.name] = parseFn(e.value);
        return a;
      }, {});
};


/// T
const keySystemsMap = {
  'urn:uuid:1077efec-c0b2-4d02-ace3-3c1e52e2fb4b': 'org.w3.clearkey',
  'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed': 'com.widevine.alpha',
  'urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95': 'com.microsoft.playready',
  'urn:uuid:f239e769-efa3-4850-9c16-a903c6932efb': 'com.adobe.primetime'
};

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

const parseCaptionServiceMetadata = (service) => {
  // 608 captions
  if (service.schemeIdUri === 'urn:scte:dash:cc:cea-608:2015') {
    const values = service.value.split(';');

    return values.map((value) => {
      let channel;
      let language;

      // default language to value
      language = value;

      if (/^CC\d=/.test(value)) {
        [channel, language] = value.split('=');
      } else if (/^CC\d$/.test(value)) {
        channel = value;
      }

      return {channel, language};
    });
  } else if (service.schemeIdUri === 'urn:scte:dash:cc:cea-708:2015') {
    const values = service.value.split(';');

    return values.map((value) => {
      const flags = {
        // service or channel number 1-63
        'channel': undefined,

        // language is a 3ALPHA per ISO 639.2/B
        // field is required
        'language': undefined,

        // BIT 1/0 or ?
        // default value is 1, meaning 16:9 aspect ratio, 0 is 4:3, ? is unknown
        'aspectRatio': 1,

        // BIT 1/0
        // easy reader flag indicated the text is tailed to the needs of beginning readers
        // default 0, or off
        'easyReader': 0,

        // BIT 1/0
        // If 3d metadata is present (CEA-708.1) then 1
        // default 0
        '3D': 0
      };

      if (/=/.test(value)) {

        const [channel, opts = ''] = value.split('=');

        flags.channel = channel;
        flags.language = value;

        opts.split(',').forEach((opt) => {
          const [name, val] = opt.split(':');

          if (name === 'lang') {
            flags.language = val;

          // er for easyReadery
          } else if (name === 'er') {
            flags.easyReader = Number(val);

          // war for wide aspect ratio
          } else if (name === 'war') {
            flags.aspectRatio = Number(val);

          } else if (name === '3D') {
            flags['3D'] = Number(val);
          }
        });
      } else {
        flags.language = value;
      }

      if (flags.channel) {
        flags.channel = 'SERVICE' + flags.channel;
      }

      return flags;
    });
  }
};

const generateKeySystemInformation = (contentProtectionNodes) => {
  return contentProtectionNodes.reduce((acc, node) => {
    const attributes = parseAttributes(node);
    const keySystem = keySystemsMap[attributes.schemeIdUri];

    if (keySystem) {
      acc[keySystem] = { attributes };

      const psshNode = findChildren(node, 'cenc:pssh')[0];

      if (psshNode) {
        const pssh = getContent(psshNode);
        const psshBuffer = pssh && decodeB64ToUint8Array(pssh);

        acc[keySystem].pssh = psshBuffer;
      }
    }

    return acc;
  }, {});
};

const getSegmentInformation = (adaptationSet) => {
  
  const segmentTemplate = findChildren(adaptationSet, 'SegmentTemplate')[0];
  const segmentList = findChildren(adaptationSet, 'SegmentList')[0];
  const segmentUrls = segmentList && findChildren(segmentList, 'SegmentURL')
    .map(s => merge({ tag: 'SegmentURL' }, parseAttributes(s)));
  const segmentBase = findChildren(adaptationSet, 'SegmentBase')[0];
  const segmentTimelineParentNode = segmentList || segmentTemplate;
  const segmentTimeline = segmentTimelineParentNode &&
    findChildren(segmentTimelineParentNode, 'SegmentTimeline')[0];
  const segmentInitializationParentNode = segmentList || segmentBase || segmentTemplate;
  const segmentInitialization = segmentInitializationParentNode &&
    findChildren(segmentInitializationParentNode, 'Initialization')[0];
  
  // SegmentTemplate is handled slightly differently, since it can have both
  // @initialization and an <Initialization> node.  @initialization can be templated,
  // while the node can have a url and range specified.  If the <SegmentTemplate> has
  // both @initialization and an <Initialization> subelement we opt to override with
  // the node, as this interaction is not defined in the spec.
  const template = segmentTemplate && parseAttributes(segmentTemplate);

  if (template && segmentInitialization) {
    template.initialization =
      (segmentInitialization && parseAttributes(segmentInitialization));
  } else if (template && template.initialization) {
    // If it is @initialization we convert it to an object since this is the format that
    // later functions will rely on for the initialization segment.  This is only valid
    // for <SegmentTemplate>
    template.initialization = { sourceURL: template.initialization };
  }

  const segmentInfo = {
    template,
    timeline: segmentTimeline &&
      findChildren(segmentTimeline, 'S').map(s => parseAttributes(s)),
    list: segmentList && merge(
      parseAttributes(segmentList),
      {
        segmentUrls,
        initialization: parseAttributes(segmentInitialization)
      }
    ),
    base: segmentBase && merge(parseAttributes(segmentBase), {
      initialization: parseAttributes(segmentInitialization)
    })
  };
  
  Object.keys(segmentInfo).forEach(key => {
    if (!segmentInfo[key]) {
      delete segmentInfo[key];
    }
  });

 

  return segmentInfo;
};

const decodeB64ToUint8Array = (b64Text) => {
  var decodedString = atob(b64Text);
  var array = new Uint8Array(decodedString.length);

  for (var i = 0; i < decodedString.length; i++) {
    array[i] = decodedString.charCodeAt(i);
  }

  return array;
}

const inheritBaseUrls = (adaptationSetAttributes, adaptationSetBaseUrls, adaptationSetSegmentInfo) =>
  (representation) => {
    const repBaseUrlElements = findChildren(representation, 'BaseURL');
    const repBaseUrls = buildBaseUrls(adaptationSetBaseUrls, repBaseUrlElements);
    const attributes = merge(adaptationSetAttributes, parseAttributes(representation));
    const representationSegmentInfo = getSegmentInformation(representation);
    return repBaseUrls.map(baseUrl => {
      return {
        segmentInfo: merge(adaptationSetSegmentInfo, representationSegmentInfo),
        attributes: merge(attributes, { baseUrl })
      };
    });
  };

const toRepresentations = (periodAttributes, periodBaseUrls, periodSegmentInfo) => (adaptationSet) => {

  const adaptationSetAttributes = parseAttributes(adaptationSet);
  const adaptationSetBaseUrls = buildBaseUrls(
    periodBaseUrls,
    findChildren(adaptationSet, 'BaseURL')
  );

   
  const role = findChildren(adaptationSet, 'Role')[0];
  const roleAttributes = { role: parseAttributes(role) };
  let attrs = merge(
    periodAttributes,
    adaptationSetAttributes,
    roleAttributes,
  );

  const accessibility = findChildren(adaptationSet, 'Accessibility')[0];
  const captionServices = parseCaptionServiceMetadata(parseAttributes(accessibility));

  if (captionServices) {
    attrs = merge(attrs, { captionServices });
  }

  const label = findChildren(adaptationSet, 'Label')[0];

  if (label && label.childNodes.length) {
    const labelVal = label.childNodes[0].nodeValue.trim();

    attrs = merge(attrs, { label: labelVal });
  }

  const contentProtection = generateKeySystemInformation(findChildren(adaptationSet, 'ContentProtection'));

  if (Object.keys(contentProtection).length) {
    attrs = merge(attrs, { contentProtection });
  }

  const segmentInfo = getSegmentInformation(adaptationSet);

  
  const representations = findChildren(adaptationSet, 'Representation');

  const adaptationSetSegmentInfo = merge(periodSegmentInfo, segmentInfo);

  return flatten(representations.map(inheritBaseUrls(attrs, adaptationSetBaseUrls, adaptationSetSegmentInfo)));
};


const toAdaptationSets = (mpdAttributes, mpdBaseUrls) => (period, index) => {
  const periodBaseUrls = buildBaseUrls(mpdBaseUrls, findChildren(period, 'BaseURL')); //
  const periodAtt = parseAttributes(period);
  const parsedPeriodId = parseInt(periodAtt.id, 10);
  // fallback to mapping index if Period@id is not a number
  const periodIndex = window.isNaN(parsedPeriodId) ? index : parsedPeriodId;
  const periodAttributes = merge(mpdAttributes, { periodIndex }); //
  const adaptationSets = findChildren(period, 'AdaptationSet');
  const periodSegmentInfo = getSegmentInformation(period);



  return flatten(adaptationSets.map(toRepresentations(periodAttributes, periodBaseUrls, periodSegmentInfo)));
};

const inheritAttributes = (mpd, options = {}) =>{
    const {
        manifestUri = '',
        NOW = Date.now(),
        clientOffset = 0
    } = options;

    const periods = findChildren(mpd, 'Period');
    const locations = findChildren(mpd, 'Location');

    const mpdAttributes = parseAttributes(mpd);
    const mpdBaseUrls = buildBaseUrls([ manifestUri ], findChildren(mpd, 'BaseURL'));

    mpdAttributes.sourceDuration = mpdAttributes.mediaPresentationDuration || 0;
    mpdAttributes.NOW = NOW;
    mpdAttributes.clientOffset = clientOffset;

    


    if (locations.length) {
      mpdAttributes.locations = locations.map(getContent);
    }

    return {
      locations: mpdAttributes.locations,
      representationInfo: flatten(periods.map(toAdaptationSets(mpdAttributes, mpdBaseUrls)))
    };
    //console.log(a);
    // const mpdBaseUrls = buildBaseUrls([ manifestUri ], findChildren(mpd, 'BaseURL'));


}


export const parse = (manifestString, options = {}) => {
    // /stringToMpdXml(manifestString) // convert to document elemtn
    const parsedManifestInfo = inheritAttributes(stringToMpdXml(manifestString) , options);
    const playlists = toPlaylists(parsedManifestInfo.representationInfo);
    
    // const parsedManifestInfo = inheritAttributes(stringToMpdXml(manifestString), options);
    // const playlists = toPlaylists(parsedManifestInfo.representationInfo);

    // return toM3u8(playlists, parsedManifestInfo.locations, options.sidxMapping);
};