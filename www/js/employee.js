/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
(function () {
    "use strict";
    var client, // Connection to the Azure Mobile App backend
        store,  // Sqlite store to use for offline data sync
        syncContext, // Offline data sync context
        tableName = 'Company_Employees',
        todoItemTable; // Reference to a table endpoint on backend
    var emplid;
    var sUSR_ID;
    // Set useOfflineSync to true to use tables from local store.
    // Set useOfflineSync to false to use tables on the server.
    var useOfflineSync = false;

    // Add an event listener to call our initialization routine when the host is ready
    document.addEventListener('deviceready', onDeviceReady, false);

    /**
     * Event Handler, called when the host is ready
     *
     * @event
     */
    function onDeviceReady() {
        // Create a connection reference to our Azure Mobile Apps backend 
        client = new WindowsAzure.MobileServiceClient('https://capstoneapplication.azurewebsites.net');

        if (useOfflineSync) {
            initializeStore().then(setup);
        } else {
            setup();
        }
    }

    /**
     * Set up and initialize the local store.
     */
    function initializeStore() {
        // Create the sqlite store
        store = new WindowsAzure.MobileServiceSqliteStore();

        // Define the table schema
        return store.defineTable({
            name: tableName,
            columnDefinitions: {
                cE_ID: 'string',
                sCT_ID: 'string',
                cE_FirstName: 'string',
                cE_LastName: 'string',
                cE_Address1: 'string',
                cE_Address2: 'string',
                cE_City: 'string',
                cE_State: 'string',
                cE_Zip: 'string',
                cE_Image: 'string',
                deleted: 'boolean'
            }
        }).then(function () {
            // Initialize the sync context
            syncContext = client.getSyncContext("");

            // Define an overly simplified push handler that discards
            // local changes whenever there is an error or conflict.
            // Note that a real world push handler will have to take action according
            // to the nature of conflict.
            syncContext.pushHandler = {
                onConflict: function (pushError) {
                    return pushError.cancelAndDiscard();
                },
                onError: function (pushError) {
                    return pushError.cancelAndDiscard();
                }
            };

            return syncContext.initialize(store);
        });
    }

    /**
     * Set up the tables, event handlers and load data from the server 
     */
    function setup() {
        // Create a table reference
        if (useOfflineSync) {
            todoItemTable = client.getSyncTable(tableName);
        } else {
            todoItemTable = client.getTable(tableName);
        }
        sUSR_ID = getQueryVariable('sUSR_ID');
        emplid = getQueryVariable('emplid');
        console.log(emplid);
        getItems(emplid);
    }
    function getItems(emplid) {
        // Execute a query for uncompleted items and process
        todoItemTable
            .where({ deleted: false, cE_ID: emplid })     // Set up the query
            .read()                         // Read the results
            .then(populateInfo, handleError);
    }

    /**
 * Create a list of Todo Items
 * @param {TodoItem[]} items an array of todoitem objects
 * @returns {void}
 */
    function populateInfo(items) {
        $("#emplfname").text("First Name: " + items[0].cE_FirstName);
        $("#empllname").text("Last Name: " + items[0].cE_LastName);
        $("#empladdress1").text("Address1: " + items[0].cE_Address1);
        $("#empladdress2").text("Address2: " + items[0].cE_Address2);
        $("#emplcity").text("City: " + items[0].cE_City);
        $("#emplstate").text("State: " + items[0].cE_State);
        $("#emplzip").text("Zip: " + items[0].cE_Zip);
        $("#emplstatus").text("Deleted: " + items[0].deleted);
        $("#emplimage").attr("src", items[0].cE_Image);
    }


    /**
 * Handle error conditions
 * @param {Error} error the error that needs handling
 * @returns {void}
 */
    function handleError(error) {
        var text = error + (error.request ? ' - ' + error.request.status : '');
        console.error(text);
    }


    function getQueryVariable(variable) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) == variable) {
                return decodeURIComponent(pair[1]);
            }
        }
        alert('Query variable %s not found', variable);
    }

    window.deleteEmployee = function () {
        jConfirm('Are you sure that you want to delete this employee?', 'Confirmation Dialog', function (r) {
            if (r) {
                deleteItemHandler(emplid)
            } else {
                //do nothing
            }
        });        
    }

    function deleteItemHandler(itemId) { 
        todoItemTable
            .del({ cE_ID: itemId })   // Async send the deletion to backend
            .then(window.location.href = "/employees.html?sUSR_ID=" + sUSR_ID, handleError); // Update the UI
        event.preventDefault();
    }
})();