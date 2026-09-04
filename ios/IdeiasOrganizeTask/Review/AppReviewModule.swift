//
//  AppReviewModule.swift
//  IdeiasOrganizeTask
//
//  Asks the system to show its own rating prompt.
//
//  The App Store's rules require this API rather than a link to the store
//  page, and forbid deciding who gets to see it. The app chooses the moment —
//  after a few tasks have been closed — and the system decides the rest,
//  including how often it will actually appear.
//

import Foundation
import React
import StoreKit
import UIKit

@objc(AluzaAppReview)
final class AppReviewModule: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc(requestReview:reject:)
  func requestReview(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard
        let scene = UIApplication.shared.connectedScenes
          .compactMap({ $0 as? UIWindowScene })
          .first(where: { $0.activationState == .foregroundActive })
      else {
        resolve(false)
        return
      }

      if #available(iOS 18.0, *) {
        AppStore.requestReview(in: scene)
      } else {
        SKStoreReviewController.requestReview(in: scene)
      }

      resolve(true)
    }
  }
}
