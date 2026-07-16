#import <React/RCTBridgeModule.h>

RCT_EXTERN_MODULE(MGWidgetData, NSObject)
RCT_EXTERN_METHOD(writeData:(NSDictionary *)data
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
