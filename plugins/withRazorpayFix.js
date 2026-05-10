const { withXcodeProject } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const STUB_FILENAME = "RazorpayCoreProtocolStub.m";

const STUB_CONTENT = `\
#import <Foundation/Foundation.h>

@protocol RazorpayProtocol
@end

@protocol RazorpayPaymentCompletionProtocolWithData <RazorpayProtocol>
- (void)onPaymentError:(int32_t)code
           description:(NSString *_Nonnull)str
               andData:(NSDictionary *_Nullable)response;
- (void)onPaymentSuccess:(NSString *_Nonnull)payment_id
                 andData:(NSDictionary *_Nullable)response;
@end

@protocol ExternalWalletSelectionProtocol
- (void)onExternalWalletSelected:(NSString *_Nonnull)walletName
                 WithPaymentData:(NSDictionary *_Nullable)paymentData;
@end

__attribute__((used))
static void _forceRazorpayProtocolMetadata(void) {
    (void)@protocol(RazorpayProtocol);
    (void)@protocol(RazorpayPaymentCompletionProtocolWithData);
    (void)@protocol(ExternalWalletSelectionProtocol);
}
`;

function withRazorpayFix(config) {
  return withXcodeProject(config, (config) => {
    const projectRoot = config.modRequest.platformProjectRoot;
    const projectName = config.modRequest.projectName;
    const project = config.modResults;

    fs.writeFileSync(path.join(projectRoot, STUB_FILENAME), STUB_CONTENT);

    const groupKey = project.findPBXGroupKey({ name: projectName })
      || project.findPBXGroupKey({ path: projectName });

    if (groupKey) {
      project.addSourceFile(STUB_FILENAME, {}, groupKey);
    }

    return config;
  });
}

module.exports = withRazorpayFix;
