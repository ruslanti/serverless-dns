/*
 * Copyright (c) 2021 RethinkDNS and its authors.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import DNSParserWrap from "./dnsParserWrap.js";

export default class DNSBlock {
  constructor() {
    this.dnsParser = new DNSParserWrap();
  }
  /**
   * @param {*} param
   * @param {*} param.userBlocklistInfo
   * @param {*} param.blocklistFilter
   * @param {*} param.requestBodyBuffer
   * @returns
   */
  async RethinkModule(param) {
    let response = {};
    response.isException = false;
    response.exceptionStack = "";
    response.exceptionFrom = "";
    response.data = {};
    response.data.isBlocked = false;
    response.data.isNotBlockedExistInBlocklist = false;
    response.data.domainNameInBlocklistUint;
    response.data.domainNameUserBlocklistIntersection;
    response.data.decodedDnsPacket;
    response.data.blockedB64Flag = "";
    try {
      let decodedDnsPacket = await this.dnsParser.Decode(
        param.requestBodyBuffer,
      );
      if (param.userBlocklistInfo.isValidFlag) {
        let domainNameBlocklistInfo;
        if (
          (decodedDnsPacket.questions.length >= 1) &&
          (decodedDnsPacket.questions[0].type == "A" ||
            decodedDnsPacket.questions[0].type == "AAAA" ||
            decodedDnsPacket.questions[0].type == "CNAME")
        ) {
          domainNameBlocklistInfo = param.blocklistFilter.getDomainInfo(
            decodedDnsPacket.questions[0].name
          );
          if (domainNameBlocklistInfo.data.searchResult) {
            response.data = checkDomainBlocking(
              param.userBlocklistInfo,
              domainNameBlocklistInfo,
              param.blocklistFilter,
              decodedDnsPacket.questions[0].name,
            );
          }
        }
      }
      response.data.decodedDnsPacket = decodedDnsPacket;
    } catch (e) {
      response.isException = true;
      response.exceptionStack = e.stack;
      response.exceptionFrom = "DNSBlock RethinkModule";
      response.data = false;
      console.error("Error At : DNSBlock -> RethinkModule");
      console.error(e.stack);
    }
    return response;
  }
}

function checkDomainBlocking(
  userBlocklistInfo,
  domainNameBlocklistInfo,
  blocklistFilter,
  domainName,
) {
  let response;
  try {
    response = checkDomainNameUserFlagIntersection(
      userBlocklistInfo.userBlocklistFlagUint,
      userBlocklistInfo.flagVersion,
      domainNameBlocklistInfo,
      blocklistFilter,
      domainName,
    );
    if (response.isBlocked) {
      return response;
    }

    if (userBlocklistInfo.userServiceListUint) {
      let dnSplit = domainName.split(".");
      let dnJoin = "";
      let wildCardResponse;
      while (dnSplit.shift() != undefined) {
        dnJoin = dnSplit.join(".");
        wildCardResponse = checkDomainNameUserFlagIntersection(
          userBlocklistInfo.userServiceListUint,
          userBlocklistInfo.flagVersion,
          domainNameBlocklistInfo,
          blocklistFilter,
          dnJoin,
        );
        if (wildCardResponse.isBlocked) {
          return wildCardResponse;
        }
      }
    }
  } catch (e) {
    throw e;
  }

  return response;
}

function checkDomainNameUserFlagIntersection(
  userBlocklistFlagUint,
  flagVersion,
  domainNameBlocklistInfo,
  blocklistFilter,
  domainName,
) {
  let response = {};
  try {
    response.isBlocked = false;
    response.isNotBlockedExistInBlocklist = false;
    response.blockedB64Flag = "";
    response.blockedTag = [];
    if (domainNameBlocklistInfo.data.searchResult.has(domainName)) {
      let domainNameInBlocklistUint = domainNameBlocklistInfo.data.searchResult
        .get(domainName);
      let blockedUint = blocklistFilter.flagIntersection(
        userBlocklistFlagUint,
        domainNameInBlocklistUint,
      );
      if (blockedUint) {
        response.isBlocked = true;
        response.blockedB64Flag = blocklistFilter.getB64FlagFromUint16(
          blockedUint,
          flagVersion,
        );
      } else {
        response.isNotBlockedExistInBlocklist = true;
        blockedUint = new Uint16Array(domainNameInBlocklistUint.length);
        let index = 0;
        for (let singleBlock of domainNameInBlocklistUint) {
          blockedUint[index] = singleBlock;
          index++;
        }
        response.blockedB64Flag = blocklistFilter.getB64FlagFromUint16(
          blockedUint,
          flagVersion,
        );
      }
      response.blockedTag = blocklistFilter.getTag(blockedUint);
    }
  } catch (e) {
    throw e;
  }
  return response;
}
