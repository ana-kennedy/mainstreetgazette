#import <React/RCTBridgeModule.h>
RCT_EXTERN_MODULE(MGFoundationModels, NSObject)
RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(summarize:(NSString *)text resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
