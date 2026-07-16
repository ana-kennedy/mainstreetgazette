#import <React/RCTBridgeModule.h>
RCT_EXTERN_MODULE(MGTranslation, NSObject)
RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(translate:(NSString *)text targetLanguage:(NSString *)targetLanguage resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
