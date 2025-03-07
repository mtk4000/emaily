import React, { Component } from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import { connect } from 'react-redux';
import * as actions from '../actions';
import { box, randomBytes } from 'tweetnacl';
import {
  decode as decodeUTF8,
  encode as encodeUTF8,
} from "@stablelib/utf8";
import {
  decode as decodeBase64,
  encode as encodeBase64,
} from "@stablelib/base64";

import Header from './Header';
import Landing from './Landing';

const Dashboard = () => <h2>Dashboard</h2>;
const SurveyNew = () => <h2>SurveyNew</h2>;

async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

class App extends Component {
  async componentDidMount() {
    this.props.fetchUser();

    const newNonce = () => randomBytes(box.nonceLength);
    
    const encrypt = (
      secretOrSharedKey,
      json
    ) => {
      const nonce = newNonce();
      const messageUint8 = encodeUTF8(JSON.stringify(json));
      const encrypted = box.after(messageUint8, nonce, secretOrSharedKey)
    
      const fullMessage = new Uint8Array(nonce.length + encrypted.length);
      fullMessage.set(nonce);
      fullMessage.set(encrypted, nonce.length);
    
      const base64FullMessage = encodeBase64(fullMessage);
      return base64FullMessage;
    };
    
    const decrypt = (
      secretOrSharedKey,
      messageWithNonce,
    ) => {
      const messageWithNonceAsUint8Array = decodeBase64(messageWithNonce);
      const nonce = messageWithNonceAsUint8Array.slice(0, box.nonceLength);
      const message = messageWithNonceAsUint8Array.slice(
        box.nonceLength,
        messageWithNonce.length
      );
    
      const decrypted = box.open.after(message, nonce, secretOrSharedKey);
    
      if (!decrypted) {
        throw new Error('Could not decrypt message');
      }
    
      const base64DecryptedMessage = decodeUTF8(decrypted);
      return JSON.parse(base64DecryptedMessage);
    };
    
    const message = { hello: 'world' };
    const seedA = await sha256("my password");
    const pairA = box.keyPair.fromSecretKey(seedA);

    const pairB = box.keyPair();
    const sharedA = box.before(pairB.publicKey, pairA.secretKey);
    const sharedB = box.before(pairA.publicKey, pairB.secretKey);
    const encrypted = encrypt(sharedA, message);
    const decrypted = decrypt(sharedB, encrypted);
    console.log("Message:", message);
    console.log("Encrypted:", encrypted);
    console.log("Decrypted:", decrypted);
  }

  render() {
    return (
      <div className="container">
        <BrowserRouter>
          <div>
            <Header />
            <Route exact path="/" component={Landing} />
            <Route exact path="/surveys" component={Dashboard} />
            <Route path="/surveys/new" component={SurveyNew} />
          </div>
        </BrowserRouter>
      </div>
    );
  }
};

export default connect(null, actions)(App);