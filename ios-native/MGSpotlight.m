#import <React/RCTBridgeModule.h>

RCT_EXTERN_MODULE(MGSpotlight, NSObject)
RCT_EXTERN_METHOD(indexItems:(NSArray *)items
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(deleteAllItems:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
