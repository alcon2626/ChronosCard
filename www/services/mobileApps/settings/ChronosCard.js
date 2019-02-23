var ChronosCardClient;
document.addEventListener("deviceready", function () {
    ChronosCardClient = new WindowsAzure.MobileServiceClient(
                    "https://chronoscard.azurewebsites.net");
});