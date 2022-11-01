(function (window) {
  const data = {
    1000: {
      text: "Approved",
      implications:
        "The customer's card was likely approved by the network, but denied by the bank. This is usually because the provided postal code or CVV does not match the expected value",
    },
    2000: {
      text: "Do Not Honor",
      implications:
        "The customer's bank is unwilling to accept the transaction. The customer will need to contact their bank for more details regarding this generic decline.",
    },
    2001: {
      text: "Insufficient Funds",
      implications:
        "The account did not have sufficient funds to cover the transaction amount at the time of the transaction – subsequent attempts at a later date may be successful.",
    },
    2002: {
      text: "Limit Exceeded",
      implications:
        "The attempted transaction exceeds the withdrawal limit of the account. The customer will need to contact their bank to change the account limits or use a different payment method.",
    },
    2003: {
      text: "Cardholder's Activity Limit Exceeded",
      implications:
        "The attempted transaction exceeds the activity limit of the account. The customer will need to contact their bank to change the account limits or use a different payment method.",
    },
    2004: {
      text: "Expired Card",
      implications:
        "Card is expired. The customer will need to use a different payment method.",
    },
    2005: {
      text: "Invalid Credit Card Number",
      implications:
        "The customer entered an invalid payment method or made a typo in their credit card information. Have the customer correct their payment information and attempt the transaction again – if the decline persists, they will need to contact their bank.",
    },
    2006: {
      text: "Invalid Expiration Date",
      implications:
        "The customer entered an invalid payment method or made a typo in their card expiration date. Have the customer correct their payment information and attempt the transaction again – if the decline persists, they will need to contact their bank.",
    },
    2007: {
      text: "No Account",
      implications:
        "The submitted card number is not on file with the card-issuing bank. The customer will need to contact their bank.",
    },
    2008: {
      text: "Card Account Length Error",
      implications:
        "The submitted card number does not include the proper number of digits. Have the customer attempt the transaction again – if the decline persists, the customer will need to contact their bank.",
    },
    2009: {
      text: "No Such Issuer",
      implications:
        "This decline code could indicate that the submitted card number does not correlate to an existing card-issuing bank or that there is a connectivity error with the issuer. The customer will need to contact their bank for more information.",
    },
    2010: {
      text: "Card Issuer Declined CVV",
      implications:
        "The customer entered in an invalid security code or made a typo in their card information. Have the customer attempt the transaction again – if the decline persists, the customer will need to contact their bank.",
    },
    2011: {
      text: "Voice Authorization Required",
      implications:
        "The customer’s bank is requesting that the merchant (you) call to obtain a special authorization code in order to complete this transaction. This can result in a lengthy process – we recommend obtaining a new payment method instead. Contact us for more details.",
    },
    2012: {
      text: "Processor Declined – Possible Lost Card",
      implications:
        "The card used has likely been reported as lost. The customer will need to contact their bank for more information.",
    },
    2013: {
      text: "Processor Declined – Possible Stolen Card",
      implications:
        "The card used has likely been reported as stolen. The customer will need to contact their bank for more information.",
    },
    2014: {
      text: "Processor Declined – Fraud Suspected",
      implications:
        "The customer’s bank suspects fraud – they will need to contact their bank for more information.",
    },
    2015: {
      text: "Transaction Not Allowed",
      implications:
        "The customer's bank is declining the transaction for unspecified reasons, possibly due to an issue with the card itself. They will need to contact their bank or use a different payment method.",
    },
    2016: {
      text: "Duplicate Transaction",
      implications:
        "The submitted transaction appears to be a duplicate of a previously submitted transaction and was declined to prevent charging the same card twice for the same service.",
    },
    2017: {
      text: "Cardholder Stopped Billing",
      implications:
        "The customer requested a cancellation of a single transaction – reach out to them for more information.",
    },
    2018: {
      text: "Cardholder Stopped All Billing",
      implications:
        "The customer requested the cancellation of a recurring transaction or subscription – reach out to them for more information.",
    },
    2019: {
      text: "Invalid Transaction",
      implications:
        "The customer’s bank declined the transaction, typically because the card in question does not support this type of transaction – for example, the customer used an FSA debit card for a non-healthcare related purchase. They will need to contact their bank for more information.",
    },
    2020: {
      text: "Violation",
      implications:
        "The customer will need to contact their bank for more information.",
    },
    2021: {
      text: "Security Violation",
      implications:
        "The customer's bank is declining the transaction, possibly due to a fraud concern. They will need to contact their bank or use a different payment method.",
    },
    2022: {
      text: "Declined – Updated Cardholder Available",
      implications:
        "The submitted card has expired or been reported lost and a new card has been issued. Reach out to your customer to obtain updated card information.",
    },
    2023: {
      text: "Processor Does Not Support This Feature",
      implications:
        "Your account can't process transactions with the intended feature – for example, 3D Secure or Level 2/Level 3 data. If you believe your merchant account should be set up to accept this type of transaction, contact us.",
    },
    2024: {
      text: "Card Type Not Enabled",
      implications:
        "Your account can't process the attempted card type. If you believe your merchant account should be set up to accept this type of card, contact us for assistance.",
    },
    2025: {
      text: "Set Up Error – Merchant",
      implications:
        "Depending on your region, this response could indicate a connectivity or setup issue. Contact us for more information regarding this error message.",
    },
    2026: {
      text: "Invalid Merchant ID",
      implications:
        "The customer’s bank declined the transaction, typically because the card in question does not support this type of transaction. If this response persists across transactions for multiple customers, it could indicate a connectivity or setup issue. Contact us for more information regarding this error message.",
    },
    2027: {
      text: "Set Up Error – Amount",
      implications:
        "This rare decline code indicates an issue with processing the amount of the transaction. The customer will need to contact their bank for more details.",
    },
    2028: {
      text: "Set Up Error – Hierarchy",
      implications:
        "There is a setup issue with your account. Contact us for more information.",
    },
    2029: {
      text: "Set Up Error – Card",
      implications:
        "This response generally indicates that there is a problem with the submitted card. The customer will need to use a different payment method.",
    },
    2030: {
      text: "Set Up Error – Terminal",
      implications:
        "There is a setup issue with your account. Contact us for more information.",
    },
    2031: {
      text: "Encryption Error",
      implications:
        "The cardholder’s bank does not support $0.00 card verifications. Enable the Retry All Failed $0 option to resolve this error. Contact us with questions.",
    },
    2032: {
      text: "Surcharge Not Permitted",
      implications:
        "Surcharge amount not permitted on this card. The customer will need to use a different payment method.",
    },
    2033: {
      text: "Inconsistent Data",
      implications:
        "An error occurred when communicating with the processor. The customer will need to contact their bank for more details.",
    },
    2034: {
      text: "No Action Taken",
      implications:
        "An error occurred and the intended transaction was not completed. Attempt the transaction again.",
    },
    2035: {
      text: "Partial Approval For Amount In Group III Version",
      implications:
        "The customer's bank approved the transaction for less than the requested amount. Have the customer attempt the transaction again – if the decline persists, the customer will need to use a different payment method.",
    },
    2036: {
      text: "Authorization could not be found",
      implications:
        "An error occurred when trying to process the authorization. This response could indicate an issue with the customer’s card or that the processor doesn't allow this action – contact us for more information.",
    },
    2037: {
      text: "Already Reversed",
      implications:
        "The indicated authorization has already been reversed. If you believe this to be false, contact us for more information.",
    },
    2038: {
      text: "Processor Declined",
      implications:
        "The customer's bank is unwilling to accept the transaction. The reasons for this response can vary – customer will need to contact their bank for more details.",
    },
    2039: {
      text: "Invalid Authorization Code",
      implications:
        "The authorization code was not found or not provided. Have the customer attempt the transaction again – if the decline persists, they will need to contact their bank.",
    },
    2040: {
      text: "Invalid Store",
      implications:
        "There may be an issue with the configuration of your account. Have the customer attempt the transaction again – if the decline persists, contact us for more information.",
    },
    2041: {
      text: "Declined – Call For Approval",
      implications:
        "The card used for this transaction requires customer approval – they will need to contact their bank.",
    },
    2042: {
      text: "Invalid Client ID",
      implications:
        "There may be an issue with the configuration of your account. Have the customer attempt the transaction again – if the decline persists, contact us for more information.",
    },
    2043: {
      text: "Error – Do Not Retry, Call Issuer",
      implications:
        "The card-issuing bank will not allow this transaction. The customer will need to contact their bank for more information.",
    },
    2044: {
      text: "Declined – Call Issuer",
      implications:
        "The card-issuing bank has declined this transaction. Have the customer attempt the transaction again – if the decline persists, they will need to contact their bank for more information.",
    },
    2045: {
      text: "Invalid Merchant Number",
      implications:
        "There is a setup issue with your account. Contact us for more information.",
    },
    2046: {
      text: "Declined",
      implications:
        "The customer's bank is unwilling to accept the transaction. For credit/debit card transactions, the customer will need to contact their bank for more details regarding this generic decline; if this is a PayPal transaction, the customer will need to contact PayPal.",
    },
    2047: {
      text: "Call Issuer. Pick Up Card",
      implications:
        "The customer’s card has been reported as lost or stolen by the cardholder and the card-issuing bank has requested that merchants keep the card and call the number on the back to report it. As an online merchant, you don’t have the physical card and can't complete this request – obtain a different payment method from the customer.",
    },
    2048: {
      text: "Invalid Amount",
      implications:
        "The authorized amount is set to zero, is unreadable, or exceeds the allowable amount. Make sure the amount is greater than zero and in a suitable format.",
    },
    2049: {
      text: "Invalid SKU Number",
      implications:
        "A non-numeric value was sent with the attempted transaction. Fix errors and resubmit with the transaction with the proper SKU Number.",
    },
    2050: {
      text: "Invalid Credit Plan",
      implications:
        "There may be an issue with the customer’s card or a temporary issue at the card-issuing bank. The customer will need to contact their bank for more information or use a different payment method.",
    },
    2051: {
      text: "Credit Card Number does not match method of payment",
      implications:
        "There may be an issue with the customer’s credit card or a temporary issue at the card-issuing bank. Have the customer attempt the transaction again – if the decline persists, ask for a different card or payment method.",
    },
    2053: {
      text: "Card reported as lost or stolen",
      implications:
        "The card used was reported lost or stolen. The customer will need to contact their bank for more information or use a different payment method.",
    },
    2054: {
      text: "Reversal amount does not match authorization amount",
      implications:
        "Either the refund amount is greater than the original transaction or the card-issuing bank does not allow partial refunds. The customer will need to contact their bank for more information or use a different payment method.",
    },
    2055: {
      text: "Invalid Transaction Division Number",
      implications:
        "Contact us\n\n for more information regarding this error message.",
    },
    2056: {
      text: "Transaction amount exceeds the transaction division limit",
      implications:
        "Contact us\n\n for more information regarding this error message.",
    },
    2057: {
      text: "Issuer or Cardholder has put a restriction on the card",
      implications:
        "The customer will need to contact their issuing bank for more information.",
    },
    2058: {
      text: "Merchant not Mastercard SecureCode enabled",
      implications:
        "The attempted card can't be processed without enabling 3D Secure for your account. Contact us for more information regarding this feature or contact the customer for a different payment method.",
    },
    2059: {
      text: "Address Verification Failed",
      implications:
        "PayPal was unable to verify that the transaction qualifies for Seller Protection because the address was improperly formatted. The customer should contact PayPal for more information or use a different payment method.",
    },
    2060: {
      text: "Address Verification and Card Security Code Failed",
      implications:
        "Both the AVS and CVV checks failed for this transaction. The customer should contact PayPal for more information or use a different payment method.",
    },
    2061: {
      text: "Invalid Transaction Data",
      implications:
        "There may be an issue with the customer’s card or a temporary issue at the card-issuing bank. Have the customer attempt the transaction again – if the decline persists, ask for a different card or payment method.",
    },
    2062: {
      text: "Invalid Tax Amount",
      implications:
        "There may be an issue with the customer’s card or a temporary issue at the card-issuing bank. Have the customer attempt the transaction again – if the decline persists, ask for a different card or payment method.",
    },
    2063: {
      text: "PayPal Business Account preference resulted in the transaction failing",
      implications:
        "You can't process this transaction because your account is set to block certain payment types, such as eChecks or foreign currencies. If you believe you have received this decline in error, contact us.",
    },
    2064: {
      text: "Invalid Currency Code",
      implications:
        "There may be an issue with the configuration of your account for the currency specified. Contact us for more information.",
    },
    2065: {
      text: "Refund Time Limit Exceeded",
      implications:
        "PayPal requires that refunds are issued within 180 days of the sale. This refund can't be successfully processed.",
    },
    2066: {
      text: "PayPal Business Account Restricted",
      implications:
        "Contact PayPal’s Support team\n\n to resolve this issue with your account. Then, you can attempt the transaction again.",
    },
    2067: {
      text: "Authorization Expired",
      implications: "The PayPal authorization is no longer valid.",
    },
    2068: {
      text: "PayPal Business Account Locked or Closed",
      implications:
        "You'll need to contact PayPal’s Support team to resolve an issue with your account. Once resolved, you can attempt to process the transaction again.",
    },
    2069: {
      text: "PayPal Blocking Duplicate Order IDs",
      implications:
        "The submitted PayPal transaction appears to be a duplicate of a previously submitted transaction. This decline code indicates an attempt to prevent charging the same PayPal account twice for the same service.",
    },
    2070: {
      text: "PayPal Buyer Revoked Pre-Approved Payment Authorization",
      implications:
        "The customer revoked authorization for this payment method. Reach out to the customer for more information or a different payment method.",
    },
    2071: {
      text: "PayPal Payee Account Invalid Or Does Not Have a Confirmed Email",
      implications:
        "Customer has not finalized setup of their PayPal account. Reach out to the customer for more information or a different payment method.",
    },
    2072: {
      text: "PayPal Payee Email Incorrectly Formatted",
      implications:
        "Customer made a typo or is attempting to use an invalid PayPal account.",
    },
    2073: {
      text: "PayPal Validation Error",
      implications:
        "PayPal can't validate this transaction. Contact us for more details.",
    },
    2074: {
      text: "Funding Instrument In The PayPal Account Was Declined By The Processor Or Bank, Or It Can't Be Used For This Payment",
      implications:
        "The customer’s payment method associated with their PayPal account was declined. Reach out to the customer for more information or a different payment method.",
    },
    2075: {
      text: "Payer Account Is Locked Or Closed",
      implications:
        "The customer’s PayPal account can't be used for transactions at this time. The customer will need to contact PayPal for more information or use a different payment method.",
    },
    2076: {
      text: "Payer Cannot Pay For This Transaction With PayPal",
      implications:
        "The customer should contact PayPal for more information or use a different payment method. You may also receive this response if you create transactions using the email address registered with your PayPal Business Account.",
    },
    2077: {
      text: "Transaction Refused Due To PayPal Risk Model",
      implications:
        "PayPal has declined this transaction due to risk limitations. You'll need to contact PayPal’s Support team to resolve this issue.",
    },
    2079: {
      text: "PayPal Merchant Account Configuration Error",
      implications:
        "You'll need to contact us to resolve an issue with your account. Once resolved, you can attempt to process the transaction again.",
    },
    2081: {
      text: "PayPal pending payments are not supported",
      implications:
        "Braintree received an unsupported Pending Verification response from PayPal. Contact Braintree’s Support team to resolve a potential issue with your account settings. If there is no issue with your account, have the customer reach out to PayPal for more information.",
    },
    2082: {
      text: "PayPal Domestic Transaction Required",
      implications:
        "This transaction requires the customer to be a resident of the same country as the merchant. Reach out to the customer for a different payment method.",
    },
    2083: {
      text: "PayPal Phone Number Required",
      implications:
        "This transaction requires the payer to provide a valid phone number. The customer should contact PayPal for more information or use a different payment method.",
    },
    2084: {
      text: "PayPal Tax Info Required",
      implications:
        "The customer must complete their PayPal account information, including submitting their phone number and all required tax information.",
    },
    2085: {
      text: "PayPal Payee Blocked Transaction",
      implications:
        "Fraud settings on your PayPal business account are blocking payments from this customer. These can be adjusted in the Block Payments section of your PayPal business account.",
    },
    2086: {
      text: "PayPal Transaction Limit Exceeded",
      implications:
        "The settings on the customer's account do not allow a transaction amount this large. They will need to contact PayPal to resolve this issue.",
    },
    2087: {
      text: "PayPal reference transactions not enabled for your account",
      implications:
        "PayPal API permissions are not set up to allow reference transactions. You'll need to contact PayPal’s Support team to resolve an issue with your account. Once resolved, you can attempt to process the transaction again.",
    },
    2088: {
      text: "Currency not enabled for your PayPal seller account",
      implications:
        "This currency is not currently supported by your PayPal account. You can accept additional currencies by updating your PayPal profile.",
    },
    2089: {
      text: "PayPal payee email permission denied for this request",
      implications:
        "PayPal API permissions are not set up between your PayPal business accounts. Contact us for more information.",
    },
    2090: {
      text: "PayPal account not configured to refund more than settled amount",
      implications:
        "Your PayPal account is not set up to refund amounts higher than the original transaction amount. Contact PayPal's Support team for information on how to enable this.",
    },
    2091: {
      text: "Currency of this transaction must match currency of your PayPal account",
      implications:
        "Your PayPal account can only process transactions in the currency of your home country. Contact PayPal's Support team for more information.",
    },
    2092: {
      text: "No Data Found - Try Another Verification Method",
      implications:
        "The processor is unable to provide a definitive answer about the customer's bank account. Please try a different US bank account verification method.",
    },
    2093: {
      text: "PayPal payment method is invalid",
      implications:
        "The PayPal payment method has either expired or been canceled.",
    },
    2094: {
      text: "PayPal payment has already been completed",
      implications:
        "Your integration is likely making PayPal calls out of sequence. Check the error response for more details.",
    },
    2095: {
      text: "PayPal refund is not allowed after partial refund",
      implications:
        "Once a PayPal transaction is partially refunded, all subsequent refunds must also be partial refunds for the remaining amount or less. Full refunds are not allowed after a PayPal transaction has been partially refunded.",
    },
    2096: {
      text: "PayPal buyer account can't be the same as the seller account",
      implications:
        "PayPal buyer account can't be the same as the seller account.",
    },
    2097: {
      text: "PayPal authorization amount limit exceeded",
      implications:
        "PayPal authorization amount is greater than the allowed limit on the order.",
    },
    2098: {
      text: "PayPal authorization count limit exceeded",
      implications:
        "The number of PayPal authorizations is greater than the allowed number on the order.",
    },
    2099: {
      text: "Cardholder Authentication Required",
      implications:
        "The customer's bank declined the transaction because a 3D Secure authentication was not performed during checkout. Have the customer authenticate using 3D Secure, then attempt the authorization again.",
    },
    2100: {
      text: "PayPal channel initiated billing not enabled for your account",
      implications:
        "Your PayPal permissions are not set up to allow channel initiated billing transactions. Contact PayPal's Support team for information on how to enable this. Once resolved, you can attempt to process the transaction again.",
    },
    2101: {
      text: "Additional authorization required",
      implications:
        "This transaction requires additional customer credentials for authorization. The customer should insert their chip.",
    },
    2102: {
      text: "Incorrect PIN",
      implications: "The entered PIN was incorrect.",
    },
    2103: {
      text: "PIN try exceeded",
      implications: "The allowable number of PIN tries has been exceeded.",
    },
    2104: {
      text: "Offline Issuer Declined",
      implications:
        "The transaction was declined offline by the issuer. The customer will need to contact their bank for more information.",
    },
    3000: {
      text: "Processor Network Unavailable – Try Again",
      implications:
        "This response could indicate a problem with the back-end processing network, not necessarily a problem with the payment method. Have the customer attempt the transaction again – if the decline persists, contact us for more information.",
    },
    default: {
      text: "Processor Declined",
      implications:
        "The customer's bank is unwilling to accept the transaction. The customer will need to contact their bank for more details regarding this generic decline.",
    },
  };

  class BraintreeError {
    constructor(options) {
      this.code = options.code;
      this.text = options.text;
      this.implication = options.implication;
    }
  }

  class BraintreeErrorParser {
    static parse(errorText) {
      var regExp = /\(([^)]+)\)/;
      var errorCode = regExp.exec(errorText);
      if (errorCode && errorCode.length && errorCode[1]) {
        return new BraintreeError({
          code: errorCode[1],
          text: data[errorCode[1]].text,
          implication: data[errorCode[1]].implications,
        });
      } else {
        return new BraintreeError({
          code: "default",
          text: data["default"].text,
          implication: data["default"].implications,
        });
      }
    }
  }

  window["BraintreeErrorParser"] = BraintreeErrorParser;
})(window);
