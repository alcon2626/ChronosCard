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
        tableName = 'System_Users',
        todoItemTable; // Reference to a table endpoint on backend
    var username;
    var password;
    var email;
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
        username = $("#username");
        password = $("#password");
        email = $("#email");
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
                sUSR_ID: 'string',
                sUSR_Name: 'string',
                sUSR_Password: 'string',
                sUSR_Email: 'string',
                sUSR_logInName: 'string',
                deleted: 'boolean'
            }
        }).then(function () {
            // Initialize the sync context
            syncContext = client.getSyncContext();

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
            console.log('using offline db');
        } else {
            todoItemTable = client.getTable(tableName);
            console.log('using online db');
        }

        // Wire up the UI Event Handler for the Add Item
        $('#Signup').on("click", addItemHandler);
    }

    /**
     * Synchronize local table with the table on the server.
     * We do this by pushing local changes to the server and then
     * pulling the latest changes from the server.
     */
    function syncLocalTable() {
        return syncContext
            .push()
            .then(function () {
                return syncContext.pull(new WindowsAzure.Query(tableName));
            });
    }

    /**
     * Handle error conditions
     * @param {Error} error the error that needs handling
     * @returns {void}
     */
    function handleError(error) {
        console.error(text);
    }

    /**
     * Event handler for when the user enters some text and clicks on Add
     * @param {Event} event the event that caused the request
     * @returns {void}
     */
    function addItemHandler(event) {
        if (username.val() !== "" && password.val() !== "" && email.val() !== "") {
            console.log('sync Local Table and pushing item');
            if (useOfflineSync) {
                syncLocalTable().then(pushItem);
            } else {
                pushItem();
            }
        } else {
            console.log("Missing values");
        }
        event.preventDefault();
    }

    function pushItem() {
        todoItemTable.insert({
            sUSR_Email: email.val(),
            sUSR_logInName: username.val(),
            sUSR_Password: password.val()
        }).then(alert("Sucessful login created!."), handleError);

        email.val("").focus();
        username.val("");
        password.val("");
    }

})();