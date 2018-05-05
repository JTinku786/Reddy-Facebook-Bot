'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const apiai = require('apiai');

const token = process.env.FB_PAGE_ACCESS_TOKEN
const vtoken = process.env.FB_VERIFY_ACCESS_TOKEN
const APP_SECRET = process.env.MESSENGER_APP_SECRET
const SERVER_URL = process.env.SERVER_URL
const APIAI_TOKEN = process.env.APIAI_TOKEN;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;





// Process application/json
app.use(bodyParser.json())

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}))

// Spin up the server
const server = app.listen(process.env.PORT || 5000, () => {
  console.log(__dirname)
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
  });

const apiaiApp = apiai(APIAI_TOKEN);

// Index route
app.get('/', function (req, res) {
	res.send('Hello world, I am a chat bot')
})

//Getting Images
app.get('/assets',function(req,res){
  res.send("Assets folder is called")
  console.log(__filename)
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
	// if (req.query['hub.verify_token'] === vtoken) {
	// 	res.send(req.query['hub.challenge'])
	// }
    // res.send('Error, wrong token')
    if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === vtoken) {
  console.log("Validating webhook");
  res.status(200).send(req.query['hub.challenge']);
} else {
  console.error("Failed validation. Make sure the validation tokens match.");
  res.sendStatus(403);
}
})

app.post('/webhook', (req, res) => {  
    // let messaging_events = req.body.entry[0].messaging
    // for (let i = 0; i < messaging_events.length; i++) {
    //   let event = req.body.entry[0].messaging[i]
    //   let sender = event.sender.id
    //   if (event.message && event.message.text) {
    //     let text = event.message.text
    //     res.send(text)
    //     // sendText(sender, "Message received: " + text.substring(0, 200))
    //   }
    // }
    // res.sendStatus(200)

    var data = req.body;
    console.log(data.object)
    // Make sure this is a page subscription
    if (data.object == 'page') {
      // Iterate over each entry
      // There may be multiple if batched
      data.entry.forEach(function(pageEntry) {
        var pageID = pageEntry.id;
        var timeOfEvent = pageEntry.time;
  console.log("hia");
        // Iterate over each messaging event
        pageEntry.messaging.forEach(function(messagingEvent) {
          if (messagingEvent.optin) {
              console.log("1");
            receivedAuthentication(messagingEvent);
          } else if (messagingEvent.message) {
              console.log("2");
            receivedMessage(messagingEvent);
          } else if (messagingEvent.delivery) {
              console.log("3")
            receivedDeliveryConfirmation(messagingEvent);
          } else if (messagingEvent.postback) {
              console.log("4")
            receivedPostback(messagingEvent);
          } else if (messagingEvent.read) {
              console.log("5")
            receivedMessageRead(messagingEvent);
          } else if (messagingEvent.account_linking) {
              console.log("6")
            receivedAccountLink(messagingEvent);
          } else {
              console.log("7")
            console.log("Webhook received unknown messagingEvent: ", messagingEvent);
          }
        });
      });
  
      // Assume all went well.
      //
      // You must send back a 200, within 20 seconds, to let us know you've
      // successfully received the callback. Otherwise, the request will time out.
      res.sendStatus(200);
    }
  
  });

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL.
 *
 */
app.get('/authorize', function(req, res) {
    var accountLinkingToken = req.query.account_linking_token;
    console.log("account linking token"+accountLinkingToken);
    var redirectURI = req.query.redirect_uri;
  console.log("redirect uri : "+redirectURI);
    // Authorization Code should be generated per user by the developer. This will
    // be passed to the Account Linking callback.
    var authCode = "1234567890";
  
    // Redirect users to this URI on successful login
    var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;
  console.log("Redirect value "+redirectURISuccess)
    res.render('authorize', {
      accountLinkingToken: accountLinkingToken,
      redirectURI: redirectURI,
      redirectURISuccess: redirectURISuccess
    });
  });
  
  /*
   * Verify that the callback came from Facebook. Using the App Secret from
   * the App Dashboard, we can verify the signature that is sent with each
   * callback in the x-hub-signature field, located in the header.
   *
   * https://developers.facebook.com/docs/graph-api/webhooks#setup
   *
   */
  function verifyRequestSignature(req, res, buf) {
    var signature = req.headers["x-hub-signature"];
  
    if (!signature) {
      // For testing, let's log an error. In production, you should throw an
      // error.
      console.error("Couldn't validate the signature.");
    } else {
      var elements = signature.split('=');
      var method = elements[0];
      var signatureHash = elements[1];
  
      var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                          .update(buf)
                          .digest('hex');
  
      if (signatureHash != expectedHash) {
        throw new Error("Couldn't validate the request signature.");
      }
    }
  }
  
  /*
   * Authorization Event
   *
   * The value for 'optin.ref' is defined in the entry point. For the "Send to
   * Messenger" plugin, it is the 'data-ref' field. Read more at
   * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
   *
   */
  function receivedAuthentication(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfAuth = event.timestamp;
  
    // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
    // The developer can set this to an arbitrary value to associate the
    // authentication callback with the 'Send to Messenger' click event. This is
    // a way to do account linking when the user clicks the 'Send to Messenger'
    // plugin.
    var passThroughParam = event.optin.ref;
  
    console.log("Received authentication for user %d and page %d with pass " +
      "through param '%s' at %d", senderID, recipientID, passThroughParam,
      timeOfAuth);
  
    // When an authentication is received, we'll send a message back to the sender
    // to let them know it was successful.
    sendTextMessage(senderID, "Authentication successful");
  }
  
  /*
   * Message Event
   *
   * This event is called when a message is sent to your page. The 'message'
   * object format can vary depending on the kind of message that was received.
   * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
   *
   * For this example, we're going to echo any text that we get. If we get some
   * special keywords ('button', 'generic', 'receipt'), then we'll send back
   * examples of those bubbles to illustrate the special message bubbles we've
   * created. If we receive a message with an attachment (image, video, audio),
   * then we'll simply confirm that we've received the attachment.
   *
   */




  function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;
    let text = event.message.text;

    console.log("See the message : %s",event.message.text)
  
    console.log("Received message for user %d and page %d at %d with message:",
      senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));
  
    var isEcho = message.is_echo;
    var messageId = message.mid;
    var appId = message.app_id;
    var metadata = message.metadata;
  
    // You may get a text or attachment but not both
    var messageText = message.text;
    var messageAttachments = message.attachments;
    var quickReply = message.quick_reply;
  
    if (isEcho) {
      // Just logging message echoes to console
      console.log("Received echo for message %s and app %d with metadata %s",
        messageId, appId, metadata);
      return;
    } else if (quickReply) {
      var quickReplyPayload = quickReply.payload;
      console.log("Quick reply for message %s with payload %s",
        messageId, quickReplyPayload);
  
      sendTextMessage(senderID, "Quick reply tapped");
      return;
    }
  
    if (messageText) {
  
      // If we receive a text message, check to see if it matches any special
      // keywords and send back the corresponding example. Otherwise, just echo
      // the text we received.
      switch (messageText.replace(/[^\w\s]/gi, '').trim().toLowerCase()) {
        case 'hello':
        case 'hi':
          sendHiMessage(senderID);
          break;
  
        case 'image':
        console.log("Image received scene")
          requiresServerURL(sendImageMessage, [senderID]);
          break;
  
        case 'gif':
          requiresServerURL(sendGifMessage, [senderID]);
          break;
  
        case 'audio':
          requiresServerURL(sendAudioMessage, [senderID]);
          break;
  
        case 'video':
          requiresServerURL(sendVideoMessage, [senderID]);
          break;
  
        case 'file':
          requiresServerURL(sendFileMessage, [senderID]);
          break;
  
        case 'button':
          sendButtonMessage(senderID);
          break;
  
        case 'generic':
          requiresServerURL(sendGenericMessage, [senderID]);
          break;
  
        case 'receipt':
          requiresServerURL(sendReceiptMessage, [senderID]);
          break;
  
        case 'quick reply':
          sendQuickReply(senderID);
          break;
  
        case 'read receipt':
          sendReadReceipt(senderID);
          break;
  
        case 'typing on':
          sendTypingOn(senderID);
          break;
  
        case 'typing off':
          sendTypingOff(senderID);
          break;
  
        case 'account linking':
        console.log("Account Linking")
          requiresServerURL(sendAccountLinking, [senderID]);
          break;
  
        default:
        
            let aiText="";
            console.log("before sending to api ai text request");
            let apiai = apiaiApp.textRequest(messageText, {
                sessionId: 'tabby_cat'
            });
            console.log("I am from api ai");
            apiai.on('response', (response) => {
                console.log(JSON.stringify(response))
                let intentName=response.result.metadata.intentName;
                console.log("intent name : "+intentName)                
                aiText = response.result.fulfillment.speech;
                console.log("The text which api gave is "+aiText); 
                switch(intentName){
                    case 'WeatherLocation':
                    let city=response.result.parameters.cities
                    console.log(city)
                    let date=response.result.parameters.date
                    console.log(date)
                    if(city){                        
                       CallWeatherAPI(senderID,city);
                    }
                    break;
                    case 'ImageRecognition':
                           sendImageMessage(senderID,"Send Image");
                    break;
                    case 'blogRecognition':
                         sendButtonMessage(senderID,"Send Blog URL")                                                                
                    break;
                    default:
                          sendButtonMessage(senderID,"Send Help Buttons")
                          sendTextMessage(senderID, aiText); 
                          requiresServerURL(sendAccountLinking, [senderID]);
                         
                }
                    
            });
            apiai.on('error', (error) => {
                console.log(error);
            });
            
            apiai.end();
         
      }
    } else if (messageAttachments) {
      var lat = null;
      var long = null;
      if(messageAttachments[0].payload.coordinates)
      {
          lat = messageAttachments[0].payload.coordinates.lat;
          long = messageAttachments[0].payload.coordinates.long;
      }

      var msg = "lat : " + lat + " ,long : " + long + "\n";

      sendTextMessage(senderID, msg);

    }
  }
  
  
  /*
   * Delivery Confirmation Event
   *
   * This event is sent to confirm the delivery of a message. Read more about
   * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
   *
   */
  function receivedDeliveryConfirmation(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var delivery = event.delivery;
    var messageIDs = delivery.mids;
    var watermark = delivery.watermark;
    var sequenceNumber = delivery.seq;
  
    if (messageIDs) {
      messageIDs.forEach(function(messageID) {
        console.log("Received delivery confirmation for message ID: %s",
          messageID);
      });
    }
  
    console.log("All message before %d were delivered.", watermark);
  }
  
  
  /*
   * Postback Event
   *
   * This event is called when a postback is tapped on a Structured Message.
   * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
   *
   */
  function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;
  
    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = event.postback.payload;
  
    console.log("Received postback for user %d and page %d with payload '%s' " +
      "at %d", senderID, recipientID, payload, timeOfPostback);
  
    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
    sendTextMessage(senderID, "Postback called");
  }
  
  /*
   * Message Read Event
   *
   * This event is called when a previously-sent message has been read.
   * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
   *
   */
  function receivedMessageRead(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
  
    // All messages before watermark (a timestamp) or sequence have been seen.
    var watermark = event.read.watermark;
    var sequenceNumber = event.read.seq;
  
    console.log("Received message read event for watermark %d and sequence " +
      "number %d", watermark, sequenceNumber);
  }
  
  /*
   * Account Link Event
   *
   * This event is called when the Link Account or UnLink Account action has been
   * tapped.
   * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
   *
   */
  function receivedAccountLink(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
  
    var status = event.account_linking.status;
    var authCode = event.account_linking.authorization_code;
  
    console.log("Received account link event with for user %d with status %s " +
      "and auth code %s ", senderID, status, authCode);
  }
  
  /*
   * If users came here through testdrive, they need to configure the server URL
   * in default.json before they can access local resources likes images/videos.
   */
  function requiresServerURL(next, [recipientId, ...args]) {
    if (SERVER_URL === "to_be_set_manually") {
      var messageData = {
        recipient: {
          id: recipientId
        },
        message: {
          text: `
  We have static resources like images and videos available to test, but you need to update the code you downloaded earlier to tell us your current server url.
  1. Stop your node server by typing ctrl-c
  2. Paste the result you got from running "lt —port 5000" into your config/default.json file as the "serverURL".
  3. Re-run "node app.js"
  Once you've finished these steps, try typing “video” or “image”.
          `
        }
      }
  
      callSendAPI(messageData);
    } else {
      next.apply(this, [recipientId, ...args]);
    }
  }
  
  function sendHiMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: `
  Congrats on setting up your Messenger Bot!
        `
      }
    }
  
    callSendAPI(messageData);
  }
  
  /*
   * Send an image using the Send API.
   *
   */
  function sendImageMessage(recipientId) {
      console.log("inside sendImageMessage %s",SERVER_URL)
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url:"https://bellard.org/bpg/2.png"
           // url: SERVER_URL + "/assets/Reddy.jpg"
          }
        }
      }
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Send a Gif using the Send API.
   *
   */
  function sendGifMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/instagram_logo.gif"
          }
        }
      }
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Send audio using the Send API.
   *
   */
  function sendAudioMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "audio",
          payload: {
            url: SERVER_URL + "/assets/sample.mp3"
          }
        }
      }
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Send a video using the Send API.
   *
   */
  function sendVideoMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "video",
          payload: {
            url: SERVER_URL + "/assets/allofus480.mov"
          }
        }
      }
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Send a file using the Send API.
   *
   */
  function sendFileMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "file",
          payload: {
            url: SERVER_URL + "/assets/test.txt"
          }
        }
      }
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Send a text message using the Send API.
   *
   */
  function sendTextMessage(recipientId, messageText) {
      console.log("text message is %s",messageText)

    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: messageText,
        metadata: "DEVELOPER_DEFINED_METADATA"
      }
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Send a button message using the Send API.
   *
   */
  function sendButtonMessage(recipientId,actionType) {
    if(actionType=="Send Help Buttons"){
      var messageData = {
        recipient: {
          id: recipientId
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: "How may i help you ?",
               buttons:[{
              //   // type: "web_url",
              //   // url: "https://www.oculus.com/en-us/rift/",
              //   // title: "Open Web URL"
                type:"web_url",
              url:"https://www.swiggy.com/",
              title:"Order food in swiggy"
              }, {
                type: "web_url",
                url:"https://presentation54321.blogspot.in/?m=1",
                title: "Visit my blog"
              }, 
              {
                type: "phone_number",
                title: "Call Phone Number",
                payload: "+918919373818"
              }]
            }
          }
        }
      };
    }
    else{
      var messageData = {
        recipient: {
          id: recipientId
        },
        message: {
          attachment: {    
            type:"template",
            payload:{
              template_type:"generic",
              elements:[
                {
                  title:"Great Thank you For Choosing this option",
                  subtitle:"Reddys Blog",
                  // "image_url":"https://thechangreport.com/img/lightning.png",
                  image_url:"https://bellard.org/bpg/2.png",
                  buttons: [
                    {
                      type: "element_share",
                      share_contents: { 
                        attachment: {
                          type: "template",
                          payload: {
                            template_type: "generic",
                            elements: [
                              {
                                title: "Reddys Blog",
                                subtitle: "Presentation Blog",
                                image_url: "https://bellard.org/bpg/2.png",
                                default_action: {
                                  type: "web_url",
                                  url: "https://swiggy.com"
                                },
                                buttons: [
                                  {
                                    type: "web_url",
                                    url: "https://swiggy.com", 
                                    title: "Navigate To Blog"
                                  }
                                ]
                              }
                            ]
                          }
                        }
                      }
                    }]
                }]
              }

            

            

            // type: "template",
            // payload: {
            //   template_type: "button",
            //   text: "Navigate to my blog on single click",
            //    buttons:[{
            //   //   // type: "web_url",
            //   //   // url: "https://www.oculus.com/en-us/rift/",
            //   //   // title: "Open Web URL"
            //    type:"web_url",
            //   url:"http://presentation54321.blogspot.in/?m=1",
            //   title:"Reddys Blog"
            //   }]
            // }
          }
        }
      };
    }

    
  
    callSendAPI(messageData);
  }
  
  /*
   * Send a Structured Message (Generic Message type) using the Send API.
   *
   */
  function sendGenericMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [{
              title: "rift",
              subtitle: "Next-generation virtual reality",
              item_url: "https://www.oculus.com/en-us/rift/",
              image_url: SERVER_URL + "/assets/rift.png",
              buttons: [{
                type: "web_url",
                url: "https://www.oculus.com/en-us/rift/",
                title: "Open Web URL"
              }, {
                type: "postback",
                title: "Call Postback",
                payload: "Payload for first bubble",
              }],
            }, {
              title: "touch",
              subtitle: "Your Hands, Now in VR",
              item_url: "https://www.oculus.com/en-us/touch/",
              image_url: SERVER_URL + "/assets/touch.png",
              buttons: [{
                type: "web_url",
                url: "https://www.oculus.com/en-us/touch/",
                title: "Open Web URL"
              }, {
                type: "postback",
                title: "Call Postback",
                payload: "Payload for second bubble",
              }]
            }]
          }
        }
      }
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Send a receipt message using the Send API.
   *
   */
  function sendReceiptMessage(recipientId) {
    // Generate a random receipt ID as the API requires a unique ID
    var receiptId = "order" + Math.floor(Math.random()*1000);
  
    var messageData = {
      recipient: {
        id: recipientId
      },
      message:{
        attachment: {
          type: "template",
          payload: {
            template_type: "receipt",
            recipient_name: "Peter Chang",
            order_number: receiptId,
            currency: "USD",
            payment_method: "Visa 1234",
            timestamp: "1428444852",
            elements: [{
              title: "Oculus Rift",
              subtitle: "Includes: headset, sensor, remote",
              quantity: 1,
              price: 599.00,
              currency: "USD",
              image_url: SERVER_URL + "/assets/riftsq.png"
            }, {
              title: "Samsung Gear VR",
              subtitle: "Frost White",
              quantity: 1,
              price: 99.99,
              currency: "USD",
              image_url: SERVER_URL + "/assets/gearvrsq.png"
            }],
            address: {
              street_1: "1 Hacker Way",
              street_2: "",
              city: "Menlo Park",
              postal_code: "94025",
              state: "CA",
              country: "US"
            },
            summary: {
              subtotal: 698.99,
              shipping_cost: 20.00,
              total_tax: 57.67,
              total_cost: 626.66
            },
            adjustments: [{
              name: "New Customer Discount",
              amount: -50
            }, {
              name: "$100 Off Coupon",
              amount: -100
            }]
          }
        }
      }
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Send a message with Quick Reply buttons.
   *
   */
  function sendQuickReply(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: "What's your favorite movie genre?",
        quick_replies: [
          {
            "content_type":"text",
            "title":"Action",
            "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
          },
          {
            "content_type":"text",
            "title":"Comedy",
            "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
          },
          {
            "content_type":"text",
            "title":"Drama",
            "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
          }
        ]
      }
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Send a read receipt to indicate the message has been read
   *
   */
  function sendReadReceipt(recipientId) {
    console.log("Sending a read receipt to mark message as seen");
  
    var messageData = {
      recipient: {
        id: recipientId
      },
      sender_action: "mark_seen"
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Turn typing indicator on
   *
   */
  function sendTypingOn(recipientId) {
    console.log("Turning typing indicator on");
  
    var messageData = {
      recipient: {
        id: recipientId
      },
      sender_action: "typing_on"
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Turn typing indicator off
   *
   */
  function sendTypingOff(recipientId) {
    console.log("Turning typing indicator off");
  
    var messageData = {
      recipient: {
        id: recipientId
      },
      sender_action: "typing_off"
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Send a message with the account linking call-to-action
   *
   */
  function sendAccountLinking(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: "Welcome. Link your account.",
            buttons:[{
              type: "account_link",
              url: SERVER_URL + "/authorize"
            }]
          }
        }
      }
    };
  
    callSendAPI(messageData);
  }
  
  /*
   * Call the Send API. The message data goes in the body. If successful, we'll
   * get the message id in a response
   *
   */
  function callSendAPI(messageData) {
      console.log(JSON.stringify(messageData))
    request({
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: token },
      method: 'POST',
      json: messageData
  
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var recipientId = body.recipient_id;
        var messageId = body.message_id;
  
        if (messageId) {
          console.log("Successfully sent message with id %s to recipient %s",
            messageId, recipientId);
        } else {
        console.log("Successfully called Send API for recipient %s",
          recipientId);
        }
      } else {
        console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
      }
    });
  }

function CallWeatherAPI(senderID,city){
/* Webhook for API.ai to get response from the 3rd party API */
// app.post('/ai', (req, res) => {
//     console.log('*** Webhook for api.ai query ***');
//     console.log(req.body.result);
  
//     if (req.body.result.action === 'weather') {
      console.log('*** weather ***');
//       let city = req.body.result.parameters['geo-city'];
      let restUrl='http://api.apixu.com/v1/current.json?key='+WEATHER_API_KEY+'&q=' + city;
    //   let restUrl = 'http://api.openweathermap.org/data/2.5/weather?APPID='+WEATHER_API_KEY+'&q='+city;
  console.log(restUrl)
      request.get(restUrl, (err, response, body) => {
          console.log(response.statusCode)
        if (!err && response.statusCode == 200) {
          let json = JSON.parse(body);
          console.log(json);
          let tempF = json.current.temp_f;
          let tempC = json.current.temp_c;
          let msg = 'The current condition in ' + city + ' is temperature is ' + tempF + ' ℉ (' +tempC+ ' ℃).'
          console.log(msg)
          sendTextMessage(senderID,msg);
          
        } else {
          let errorMessage = 'I failed to look up the city name.';
          sendTextMessage(senderID,errorMessage);
        }
      })
//     }
  
//   });
}
