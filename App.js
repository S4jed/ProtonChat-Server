const App = require('express')();
const HttpServer = require('http').Server(App);
const IO = require('socket.io')(HttpServer);

const Clients = new Map();

App.get('/', (request, response) =>
{
    response.send(`<h1 style='display:block'>Welcome to Proton Chat API!</h1><h3>Coded by: <a href='https://t.me/S4jed'>Sajed Mohseni</a></h3>`);
});

IO.on('connection', socket =>
{
    Clients.set(socket.id, socket);
    socket.emit('ProtonAddress', { ProtonAddress: socket.id });

    /**
     * Connect to a Remote Proton Client
     * 
     * Response    0: Succcess
     *             1: InvalidData
     *             1001: LocalAlreadyConnected
     *             1003: CannotConnectToSelf
     *             1004: RemoteNotConnected
     *             1005: RemoteAlreadyConnected
     */
    socket.on('RemoteConnection', (data) =>
    {
        data = JSON.parse(data) || { };

        if (data.ProtonAddress == undefined)
            return socket.emit('ConnectionRequest', JSON.stringify({ Response: 1 }));

        if (socket.ConnectedTo != undefined && Clients.has(socket.ConnectedTo))
            return socket.emit('ConnectionRequest', JSON.stringify({ Response: 1001 }));

        if (data.ProtonAddress == socket.id)
            return socket.emit('ConnectionRequest', JSON.stringify({ Response: 1003 }));

        if (!Clients.has(data.ProtonAddress))
            return socket.emit('ConnectionRequest', JSON.stringify({ Response: 1004 }));
        
        let client = Clients.get(data.ProtonAddress)

        if (client.id.ConnectedTo != undefined)
            return socket.emit('ConnectionRequest', JSON.stringify({ Response: 1005 }));

        client.ConnectedTo = socket.id;
        socket.ConnectedTo = client.id;

        client.emit('ConnectionRequest', JSON.stringify({ Response: 0, Remote: { ProtonAddress: socket.id }, Connected: true }));
        socket.emit('ConnectionRequest', JSON.stringify({ Response: 0, Remote: { ProtonAddress: client.id }, Connected: true }));
    });

    /**
     * Send Message to a RemoteProton
     * 
     * Response    0: Succcess
     *             1: InvalidData
     *             1000: LocalNotConnected
     *             1004: RemoteNotConnected
     */
    socket.on('Message', (data) =>
    {
        data = JSON.parse(data) || { };

        if (data.Text == undefined || typeof data.Text != 'string' || data.Text.length == 0)
            return socket.emit('Message', JSON.stringify({ Response: 1 }));

        if (socket.ConnectedTo == undefined)
            return socket.emit('Message', JSON.stringify({ Response: 1000 }));
        
        let client = Clients.get(socket.ConnectedTo)

        if (client == null)
            return socket.emit('Message', JSON.stringify({ Response: 1004 }));

        const message = JSON.stringify({ Response: 0, Sender: { ProtonAddress: socket.id }, Text: data.Text });

        client.emit('Message', message);
        socket.emit('Message', message);
    });

    /**
     * Send Frames to a RemoteProton
     * 
     * Response    0: Succcess
     *             1: InvalidData
     *             1000: LocalNotConnected
     *             1004: RemoteNotConnected
     */
    socket.on('UpdateFrame', (data) =>
    {
        data = JSON.parse(data) || { };

        if (data.Frame == undefined || typeof data.Frame != 'string' || data.Frame.length == 0 || !/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/.test(data.Frame))
            return socket.emit('UpdateFrame', JSON.stringify({ Response: 1 }));

        if (socket.ConnectedTo == undefined)
            return socket.emit('UpdateFrame', JSON.stringify({ Response: 1000 }));
        
        let client = Clients.get(socket.ConnectedTo)

        if (client == null)
            return socket.emit('UpdateFrame', JSON.stringify({ Response: 1004 }));

        client.emit('UpdateFrame', { Response: 0, ...data });
    });

    socket.on('disconnect', () =>
    {
        let client = Clients.get(socket.id);
        
        if (client.ConnectedTo != undefined && Clients.has(client.ConnectedTo))
            Clients.get(client.ConnectedTo).emit('ConnectionClosed');

        Clients.delete(socket.id);
    });
});

HttpServer.listen(process.env.PORT || 3000, () =>
{
    console.log(`Server Running on Port: ${process.env.PORT || 3000}`);
});
