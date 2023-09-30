// eslint-disable-next-line spaced-comment
/// <reference types="@fastly/js-compute" />

/*
 * Copyright (c) 2022 RethinkDNS and its authors.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import "./core/fastedge/config.js";
import { handleRequest } from "./core/doh.js";
import * as system from "./system.js";
import * as util from "./commons/util.js";

/*
var res = httpHandler.process({
  url: 'http://localhost:8080',
  method: 'POST',
  headers: [['accept', 'application/dns-message'], ['content-type', 'application/dns-message'], ['content-length', '128']],
  body: [0, 0, 1, 32, 0, 1, 0, 0, 0, 0, 0, 1, 5, 103, 99, 111, 114, 101, 3, 99, 111, 109, 0, 0, 1, 0, 1, 0, 0, 41, 16, 0, 0, 0, 0, 0, 0, 90, 0, 12, 0, 86, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
});
console.log(res);
 */
export const httpHandler = {
  process(request) {
    var my_headers = new Headers();
    for (let header of request.headers) {
      my_headers.append(header[0], header[1])
    }
    const req = new Request(request.url, {
      method: request.method,
      headers: my_headers,
      body: request.body
    });
    //return {status: 200, body: new TextEncoder().encode('CF_DNS_RESOLVER_URL')};
    const res = serveDoh(req);
    return  res.then(function(result) {
      console.log(result) // "Some User token"
      return result;
    });
  }
};

/**
 * @param {Request} req
 * @returns {Response}
 */
function serveDoh(req) {
  system.pub("prepare");

  const event = util.mkFetchEvent(req);
  return new Promise((accept) => {
    system
        .when("go")
        .then((v) => {
          return handleRequest(event);
        })
        .then((response) => {
          accept(response);
        })
        .catch((e) => {
          console.error("server", "serveDoh err", e);
          accept(util.respond405());
        });
  });
}
