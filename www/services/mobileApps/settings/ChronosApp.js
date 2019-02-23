var ChronosAppClient;
document.addEventListener("deviceready", function () {
    ChronosAppClient = new WindowsAzure.MobileServiceClient(
                    "https://chronosapp.azurewebsites.net");
});