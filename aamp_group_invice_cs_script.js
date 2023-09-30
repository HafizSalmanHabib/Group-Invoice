/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/record', 'N/search', 'N/ui/dialog', 'N/log','N/url'], function (c, record, search, dialog, log, url) {

   function pageInit(context) {
   }
   function print_invoice(cid){
   //alert('Print');
   try{
   var currentRecord = c.get();
		var scriptURL = url.resolveScript({
			scriptId: 'customscript_group_invoice_suitlet',
			deploymentId: 'customdeploy_group_invoice_suitlet',
			params: {
				id: currentRecord.id,
				rectype: currentRecord.type
			},
			returnExternalUrl: false
		});
		newWindow = window.open(scriptURL);
   }catch(e){
     alert(e.message);
   }
   }
  
   return {
      pageInit: pageInit,
      print_invoice: print_invoice
      

   }
});