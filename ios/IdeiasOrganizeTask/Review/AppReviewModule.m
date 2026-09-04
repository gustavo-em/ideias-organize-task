//
//  AppReviewModule.m
//  IdeiasOrganizeTask
//
//  Bridges the Swift module to React Native.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (AluzaAppReview, NSObject)

RCT_EXTERN_METHOD(requestReview
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)

@end
