// Better quality TypeScript code for comparison

interface User {
    id: number;
    name: string;
    age: number;
}

interface ProcessedUser {
    name: string;
    age: number;
    score: number;
}

function processUser(data: User): ProcessedUser | null {
    const { name, age } = data;
    
    if (!name) {
        return null;
    }
    
    const score = calculateScore();
    
    return {
        name: name.toUpperCase(),
        age,
        score
    };
}

function calculateScore(): number {
    return (99 * 100) / 2; // Sum of 0 to 99
}

async function fetchData<T>(url: string): Promise<T> {
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
}

class UserManager {
    private users: Map<number, User> = new Map();
    
    addUser(user: User): void {
        this.users.set(user.id, user);
    }
    
    getUser(id: number): User | undefined {
        return this.users.get(id);
    }
    
    deleteUser(id: number): boolean {
        return this.users.delete(id);
    }
    
    getAllUsers(): User[] {
        return Array.from(this.users.values());
    }
}
