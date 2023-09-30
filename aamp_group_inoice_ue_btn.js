/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function () {

    function beforeLoad(context) {
        var currentRecord = context.newRecord;
        var cid = currentRecord.id;
        
       if (context.type == context.UserEventType.VIEW) {
            context.form.clientScriptModulePath = "./aamp_group_invice_cs_script.js";
            context.form.addButton({
                id: "custpage_print_invoice",
                label: "Print",
                functionName: 'print_invoice("' + cid + '")'
            });
       }


    }
    return {
        beforeLoad: beforeLoad
    }
});