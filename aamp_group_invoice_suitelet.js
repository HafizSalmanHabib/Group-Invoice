/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *
 */
 define(['N/record', 'N/log', 'N/render', 'N/file', 'N/search', 'N/format'], function (record, log, render, file, search, format) {
  /**
  *
  * @param {*} set
  */
  /**
    * main function for suitelet
    * @param {object} ctx
    */

  function onRequest(ctx) {
    try {
      var req = ctx.request;
      var res = ctx.response;
      var params = req.parameters;
      log.debug('params', params);

      generateTemplate(ctx, params);

    }
    catch (e) {
      log.error('ERROR onRequest', e)
    }

  }

  function generateTemplate(ctx) {
    try {
      var req = ctx.request;
      var recID = req.parameters.id;
      var type = req.parameters.rectype;
      var myRecord = record.load({
        type: type,
        id: recID,
        isDynamic: true
      });
      var groupnumber = myRecord.getValue({
        fieldId: 'invoicegroupnumber'
      });
      log.debug("groupnumber", groupnumber);
      var customerid = myRecord.getValue({
        fieldId: 'customer'
      });
      log.debug("customerID", customerid);
      var customerSearchObj = search.create({
        type: 'customer',
        filters: [
           ['internalid', 'anyof', customerid]
        ],
        columns: [
           'internalid',
           'entityid'
           // Add more columns as needed
        ]
     });
     var searchResult = customerSearchObj.run().getRange({ start: 0, end: 1 });
        var customer = searchResult[0];
  
        var entityId= customer.getValue('entityid');
          log.debug("entityId",entityId);
      // var splitContent = customer.split(" ");
      // log.debug("splitContent", splitContent);
      // var customerId;
      // for (var i = 0; i < splitContent.length; i++) {
      //   customerId = splitContent[0];
      // }
      var defaultAddress = myRecord.getText({
        fieldId: 'custbody_location_address'
      });
      log.debug("defaultAddress", defaultAddress);
      var currencyName = myRecord.getValue({
        fieldId: 'custrecord_currency_symbol'
      });

      var taxtotal = myRecord.getValue({
        fieldId: 'taxtotal'
      });

      var currencySymbol = currencyNameToSymbol(currencyName);
      log.debug("Currency Symbol:", currencySymbol);

      var groupedinvs = getinvoices(recID);
      log.debug('groupedinvs', groupedinvs);
      var lineitems = [];
      var totalSubtotal = 0;
      var poRefer;
      for (var i = 0; i < groupedinvs.length; i++) {
        var invRecord = record.load({
          type: record.Type.INVOICE,
          id: groupedinvs[i],
          isDynamic: true
        });

        poRefer = invRecord.getValue({
          fieldId: 'otherrefnum'
        });
        var subTotal = invRecord.getValue({
          fieldId: 'subtotal'
        });
        totalSubtotal += parseFloat(subTotal);
        log.debug("totalSubtotal", totalSubtotal);
        var invoiceId = invRecord.getValue({
          fieldId: 'tranid'
        });
        var location = invRecord.getText({
          fieldId: 'custbody_default_location'
        });
        var shipaddress = invRecord.getValue({
          fieldId: 'shipaddress'
        });
       log.debug("shipaddress",shipaddress);
        var count = invRecord.getLineCount({
          sublistId: 'item'
        });

        for (var j = 0; j < count; j++) {
          invRecord.selectLine({
            sublistId: 'item',
            line: j
          });
          var itemNum = invRecord.getCurrentSublistText({
            sublistId: 'item',
            fieldId: 'item'
          });
          var itemdes = invRecord.getCurrentSublistText({
            sublistId: 'item',
            fieldId: 'description'
          });
          itemdes=itemdes.replace(/&/g, '');
          var qty = invRecord.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantity'
          });
          qty = parseInt(qty);
          log.debug("qty",qty);
          var rate = invRecord.getCurrentSublistText({
            sublistId: 'item',
            fieldId: 'rate'
          });
          rate = parseFloat(rate).toFixed(2);
          var tax = invRecord.getCurrentSublistText({
            sublistId: 'item',
            fieldId: 'tax1amt'
          });
          var amount = invRecord.getCurrentSublistText({
            sublistId: 'item',
            fieldId: 'amount'
          });

          var lineNum = invRecord.getCurrentSublistText({
            sublistId: 'item',
            fieldId: 'line'
          });
          var unit = invRecord.getCurrentSublistText({
            sublistId: 'item',
            fieldId: 'units'
          });

          if (currencyName == 'EUR') {
            var formattedRate = format.format({
              value: rate,
              type: format.Type.CURRENCY,
              currency: 'EUR'
            });
            log.debug("formattedRate", formattedRate);
            var inputRate = formattedRate.replace(/,/g, '');
             rate = convertToEuropeanCurrencyFormat(inputRate);

            var formattedAmount = format.format({
              value: amount,
              type: format.Type.CURRENCY,
              currency: 'EUR'
            });
            log.debug("formattedAmount", formattedAmount);
            var inputAmount = formattedAmount.replace(/,/g, '');
              amount = convertToEuropeanCurrencyFormat(inputAmount);
          }
          else{
            rate = format.format({
              value: rate,
              type: format.Type.CURRENCY,
              currency: currencySymbol
            });

            amount = format.format({
              value: amount,
              type: format.Type.CURRENCY,
              currency: currencySymbol
            });

          }

          var tempObj = {
            poReference: poRefer,
            itemName: itemNum,
            seqNum: lineNum,
            item: itemdes,
            itemRate: rate,
            quantity: qty,
            units: unit,
            tax: tax,
            grossAmt: amount,
            invoicenum: invoiceId
          };
          if (parseInt(tempObj.quantity) > 0) {
            lineitems.push(tempObj);
          }
        }
      }

      log.debug('lineitems', lineitems);

      var updatedLineItems = [];

      for (var i = 0; i < lineitems.length; i++) {
        var found = false;
        for (var j = 0; j < updatedLineItems.length; j++) {
          if (lineitems[i].invoicenum === updatedLineItems[j].invoicenum &&
            lineitems[i].item === updatedLineItems[j].item) {
            // Quantity, Gross amount, Tax calculations (if needed)
            // ...
            found = true;
            break;
          }
        }
        if (!found) {
          updatedLineItems.push(lineitems[i]);
        }
      }

      var taxPercentage = (taxtotal / totalSubtotal) * 100;
      var formattedTaxPer = parseInt(taxPercentage);

      var summaryObject;
      if (currencyName == 'EUR') {
        totalSubtotal = parseFloat(totalSubtotal);
        var formattedSubtotal = format.format({
          value: totalSubtotal,
          type: format.Type.CURRENCY,
          currency: 'EUR'
        });
        log.debug("formattedSubtotal", formattedSubtotal);
        var inputNumber = formattedSubtotal.replace(/,/g, '');
        var formatedSubTotal = convertToEuropeanCurrencyFormat(inputNumber);
        log.debug("formatedSubTotal", formatedSubTotal);

        summaryObject = {
          defaultlocation: location,
          defaAddress: defaultAddress,
          customerId: entityId,
          subtotal: formatedSubTotal,
          formattedTaxPer: formattedTaxPer,
          shipAddress: shipaddress,
          currencySymbol: currencySymbol
        };
      } else {
        var formattedSubtotal = format.format({
          value: totalSubtotal,
          type: format.Type.CURRENCY,
          currency: currencySymbol
        });
        summaryObject = {
          defaultlocation: location,
          defaAddress: defaultAddress,
          customerId: entityId,
          subtotal: formattedSubtotal,
          shipAddress: shipaddress,
          currencySymbol: currencySymbol
        };
      }

      var jsonstr = {
        'lineitems': lineitems
      };

      var jsonstr2 = {
        'summary': summaryObject
      };

      var templateFileId = 9410794;

      var xmlTemplateFile = file.load({ id: templateFileId });

      var renderer = render.create();
      renderer.templateContent = xmlTemplateFile.getContents();
      renderer.addRecord('record', record.load({
        type: type,
        id: recID
      }));
      renderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: "groupedinvoices_detailed",
        data: jsonstr
      });
      renderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: "groupedinvoices_summary",
        data: jsonstr2
      });

      var xml = renderer.renderAsString();
      var file1 = render.xmlToPdf({ xmlString: xml });
      ctx.response.renderPdf(xml);
    }
    catch (e) {
      log.error('ERROR on generateTemplate', e);
    }

  }

  function convertToEuropeanCurrencyFormat(number) {
    // Convert the number to a string if it's not already
    const numberStr = number.toString();
  
    // Split the number string into whole and decimal parts
    const parts = numberStr.split('.');
    const wholePart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    let decimalPart = "";
  
    if (parts.length > 1) {
      decimalPart = parts[1].replace(/,/g, '.'); // Replace all commas with periods
    }
  
    return decimalPart ? `${wholePart},${decimalPart}` : wholePart;
  }

  function currencyNameToSymbol(currencyName) {
    var currencyDict = {
      'USD': '$',
      'Yes': '¥',
      'British Pound': '£',
      'GBP': '£',
      'Canadian Dollar': 'C$',
      'CAD': 'C$',
      'Euro': '€',
      'EUR': '€',
      'Swedish Krona': 'kr',
      'SEK': 'kr',
      'Norwegian Krone': 'kr',
      'NOK': 'kr',
      'Danish Krone': 'kr',
      'DKK': 'kr',
      'Australian Dollar': 'A$',
      'AUD': 'A$',
      'Japanese Yen': '¥',
      'JPY': '¥',
      'Chinese Yuan': '¥',
      'CNY': '¥',
      'Indian Rupee': '₹',
      'INR': '₹',
      'Mexico': 'Mex$',
      'MXN': 'Mex$',
      'Vietnam': '₫',
      'VND': '₫'
      // Add more currency conversions here as needed
    };

    return currencyDict[currencyName] || 'Currency symbol not found.';
  }


  

  function getinvoices(recID) {
    var invoiceSearchObj = search.create({
      type: "invoice",
      filters: [
        ["type", "anyof", "CustInvc"],
        "AND",
        ["mainline", "is", "T"],
        "AND",
        ["groupedto", "anyof", recID]
      ],
      columns: [
        search.createColumn({
          name: "ordertype",
          sort: search.Sort.ASC
        }),
        "mainline",
        "trandate",
        "asofdate",
        "postingperiod",
        "taxperiod",
        "type",
        "tranid",
        "entity",
        "account",
        "memo",
        "amount"
      ]
    });
    var invoiceIds = []
    var searchResultCount = invoiceSearchObj.runPaged().count;
    log.debug("invoiceSearchObj result count", searchResultCount);
    invoiceSearchObj.run().each(function (result) {
      var invId = result.id;
      invoiceIds.push(invId);
      return true
    });
    return invoiceIds;
  }

  return {
    onRequest: onRequest,
  }
});