import AppKit
import Foundation

private let canvas: CGFloat = 120
private let sun = CGColor(srgbRed: 1, green: 198 / 255, blue: 61 / 255, alpha: 1)
private let ink = CGColor(srgbRed: 27 / 255, green: 23 / 255, blue: 16 / 255, alpha: 1)
private let grape = CGColor(srgbRed: 75 / 255, green: 58 / 255, blue: 143 / 255, alpha: 1)
private let grapeLight = CGColor(srgbRed: 168 / 255, green: 149 / 255, blue: 245 / 255, alpha: 1)
private let paper = CGColor(srgbRed: 1, green: 253 / 255, blue: 247 / 255, alpha: 1)
private let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)

private enum IconAppearance {
  case standard
  case dark
  case tinted

  var background: CGColor {
    switch self {
    case .standard: sun
    case .dark: ink
    case .tinted: paper
    }
  }

  var body: CGColor {
    switch self {
    case .standard: ink
    case .dark: sun
    case .tinted: ink
    }
  }

  var spark: CGColor {
    switch self {
    case .standard: grape
    case .dark: grapeLight
    case .tinted: ink
    }
  }
}

private func stroke(_ points: [CGPoint], color: CGColor, in context: CGContext) {
  guard let first = points.first else { return }
  context.saveGState()
  context.setStrokeColor(color)
  context.setLineWidth(14)
  context.setLineCap(.round)
  context.setLineJoin(.round)
  context.move(to: first)
  points.dropFirst().forEach { context.addLine(to: $0) }
  context.strokePath()
  context.restoreGState()
}

private func sparkPath(small: Bool) -> CGPath {
  let path = CGMutablePath()
  if small {
    path.move(to: CGPoint(x: 92, y: 24.2))
    path.addCurve(to: CGPoint(x: 95.8, y: 28), control1: CGPoint(x: 92.5, y: 24.2), control2: CGPoint(x: 95.8, y: 27.5))
    path.addCurve(to: CGPoint(x: 92, y: 31.8), control1: CGPoint(x: 95.8, y: 28.5), control2: CGPoint(x: 92.5, y: 31.8))
    path.addCurve(to: CGPoint(x: 88.2, y: 28), control1: CGPoint(x: 91.5, y: 31.8), control2: CGPoint(x: 88.2, y: 28.5))
    path.addCurve(to: CGPoint(x: 92, y: 24.2), control1: CGPoint(x: 88.2, y: 27.5), control2: CGPoint(x: 91.5, y: 24.2))
  } else {
    path.move(to: CGPoint(x: 92, y: 21))
    path.addCurve(to: CGPoint(x: 94.4, y: 25.6), control1: CGPoint(x: 93.2, y: 21), control2: CGPoint(x: 93.7, y: 23.9))
    path.addCurve(to: CGPoint(x: 99, y: 28), control1: CGPoint(x: 96.1, y: 26.3), control2: CGPoint(x: 99, y: 26.8))
    path.addCurve(to: CGPoint(x: 94.4, y: 30.4), control1: CGPoint(x: 99, y: 29.2), control2: CGPoint(x: 96.1, y: 29.7))
    path.addCurve(to: CGPoint(x: 92, y: 35), control1: CGPoint(x: 93.7, y: 32.1), control2: CGPoint(x: 93.2, y: 35))
    path.addCurve(to: CGPoint(x: 89.6, y: 30.4), control1: CGPoint(x: 90.8, y: 35), control2: CGPoint(x: 90.3, y: 32.1))
    path.addCurve(to: CGPoint(x: 85, y: 28), control1: CGPoint(x: 87.9, y: 29.7), control2: CGPoint(x: 85, y: 29.2))
    path.addCurve(to: CGPoint(x: 89.6, y: 25.6), control1: CGPoint(x: 85, y: 26.8), control2: CGPoint(x: 87.9, y: 26.3))
    path.addCurve(to: CGPoint(x: 92, y: 21), control1: CGPoint(x: 90.3, y: 23.9), control2: CGPoint(x: 90.8, y: 21))
  }
  path.closeSubpath()
  return path
}

private func drawFinalMark(appearance: IconAppearance, small: Bool, in context: CGContext) {
  stroke(
    [CGPoint(x: 29, y: 60), CGPoint(x: 47, y: 78), CGPoint(x: 89, y: 36)],
    color: appearance.body,
    in: context
  )
  context.setFillColor(appearance.spark)
  context.addPath(sparkPath(small: small))
  context.fillPath()
}

private func drawListMark(in context: CGContext) {
  stroke([CGPoint(x: 31, y: 36), CGPoint(x: 79, y: 36)], color: ink, in: context)
  stroke([CGPoint(x: 31, y: 59), CGPoint(x: 89, y: 59)], color: ink, in: context)
  stroke([CGPoint(x: 31, y: 82), CGPoint(x: 65, y: 82)], color: grape, in: context)
}

private func makePNG(size: Int, hasAlpha: Bool, draw: (CGContext) -> Void) throws -> Data {
  let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
  let alphaInfo = hasAlpha ? CGImageAlphaInfo.premultipliedLast : CGImageAlphaInfo.noneSkipLast
  guard let context = CGContext(
    data: nil,
    width: size,
    height: size,
    bitsPerComponent: 8,
    bytesPerRow: size * 4,
    space: colorSpace,
    bitmapInfo: alphaInfo.rawValue
  ) else {
    throw NSError(domain: "BrandAssets", code: 1)
  }

  context.setShouldAntialias(true)
  context.interpolationQuality = .high
  let scale = CGFloat(size) / canvas
  context.translateBy(x: 0, y: CGFloat(size))
  context.scaleBy(x: scale, y: -scale)
  draw(context)

  guard let image = context.makeImage() else { throw NSError(domain: "BrandAssets", code: 2) }
  let bitmap = NSBitmapImageRep(cgImage: image)
  guard let data = bitmap.representation(using: .png, properties: [:]) else {
    throw NSError(domain: "BrandAssets", code: 3)
  }
  return data
}

private func write(_ data: Data, to relativePath: String) throws {
  let destination = root.appendingPathComponent(relativePath)
  try FileManager.default.createDirectory(at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
  try data.write(to: destination, options: .atomic)
}

private func appIcon(size: Int, round: Bool = false, appearance: IconAppearance = .standard) throws -> Data {
  try makePNG(size: size, hasAlpha: round) { context in
    context.setFillColor(appearance.background)
    if round {
      context.fillEllipse(in: CGRect(x: 0, y: 0, width: canvas, height: canvas))
    } else {
      context.fill(CGRect(x: 0, y: 0, width: canvas, height: canvas))
    }
    drawFinalMark(appearance: appearance, small: size < 32, in: context)
  }
}

private func launchMark(size: Int) throws -> Data {
  try makePNG(size: size, hasAlpha: true) { context in
    context.setFillColor(sun)
    context.addPath(CGPath(roundedRect: CGRect(x: 0, y: 0, width: canvas, height: canvas), cornerWidth: 30, cornerHeight: 30, transform: nil))
    context.fillPath()
    drawListMark(in: context)
  }
}

let iosIcons: [(String, Int)] = [
  ("AppIcon-20.png", 20), ("AppIcon-20@2x.png", 40), ("AppIcon-20@3x.png", 60),
  ("AppIcon-29.png", 29), ("AppIcon-29@2x.png", 58), ("AppIcon-29@3x.png", 87),
  ("AppIcon-40.png", 40), ("AppIcon-40@2x.png", 80), ("AppIcon-40@3x.png", 120),
  ("AppIcon-60@2x.png", 120), ("AppIcon-60@3x.png", 180),
  ("AppIcon-76.png", 76), ("AppIcon-76@2x.png", 152), ("AppIcon-83.5@2x.png", 167),
  ("AppIcon-1024.png", 1024),
]

for (name, size) in iosIcons {
  try write(appIcon(size: size), to: "ios/IdeiasOrganizeTask/Images.xcassets/AppIcon.appiconset/\(name)")
}
try write(appIcon(size: 1024, appearance: .dark), to: "ios/IdeiasOrganizeTask/Images.xcassets/AppIcon.appiconset/AppIcon-1024-dark.png")
try write(appIcon(size: 1024, appearance: .tinted), to: "ios/IdeiasOrganizeTask/Images.xcassets/AppIcon.appiconset/AppIcon-1024-tinted.png")

let androidIcons: [(String, Int)] = [
  ("mipmap-mdpi", 48), ("mipmap-hdpi", 72), ("mipmap-xhdpi", 96),
  ("mipmap-xxhdpi", 144), ("mipmap-xxxhdpi", 192),
]
for (folder, size) in androidIcons {
  try write(appIcon(size: size), to: "android/app/src/main/res/\(folder)/ic_launcher.png")
  try write(appIcon(size: size, round: true), to: "android/app/src/main/res/\(folder)/ic_launcher_round.png")
}

for size in [24, 44, 60, 96, 180, 1024] {
  try write(
    appIcon(size: size),
    to: "assets/brand/validation/ideias-\(size).png"
  )
}

for (name, size) in [("launch-mark.png", 96), ("launch-mark@2x.png", 192), ("launch-mark@3x.png", 288)] {
  try write(launchMark(size: size), to: "ios/IdeiasOrganizeTask/Images.xcassets/LaunchMark.imageset/\(name)")
}

print("Generated standard, dark, tinted, adaptive-source and launch brand assets.")
