// Sample TypeScript code with various issues for testing

function processUser(data: any) {
    var userName = data.name;
    var userAge = data.age;
    
    if (userName == null) {
        return null;
    }
    
    // Calculate something
    var result = 0;
    for (var i = 0; i < 100; i++) {
        result = result + i;
    }
    
    return {
        name: userName.toUpperCase(),
        age: userAge,
        score: result
    };
}

function fetchData(url, callback) {
    fetch(url)
        .then(response => response.json())
        .then(data => callback(null, data))
        .catch(error => callback(error, null));
}

class UserManager {
    users: any[] = [];
    
    addUser(user: any) {
        this.users.push(user);
    }
    
    getUser(id: number) {
        for (let i = 0; i < this.users.length; i++) {
            if (this.users[i].id === id) {
                return this.users[i];
            }
        }
        return null;
    }
    
    deleteUser(id: number) {
        for (let i = 0; i < this.users.length; i++) {
            if (this.users[i].id === id) {
                this.users.splice(i, 1);
            }
        }
    }
}
