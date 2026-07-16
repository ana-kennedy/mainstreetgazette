#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

RCT_EXTERN_MODULE(MGNowPlaying, RCTEventEmitter)
RCT_EXTERN_METHOD(setMetadata:(NSDictionary *)info)
RCT_EXTERN_METHOD(updateElapsed:(double)elapsed speed:(double)speed)
RCT_EXTERN_METHOD(clearMetadata)
RCT_EXTERN_METHOD(setupRemoteCommands)
