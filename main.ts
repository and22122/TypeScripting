class ROM {
    private data: number[]
    public length: number

    public constructor(data?: number[]) {
        this.data = data ?? [];
        this.length = this.data.length
    }

    public result(address: number): number {
        if (this.data[address] !== undefined) {
            return this.data[address]
        }
        else {
            console.log(`Invalid result from rom given address ${address}(ROM.result). Returning 0.`)

            return 0;
        }
    }

    public printProgram() {
        for (let i in this.data) {
            console.log(`Address ${i}: ${this.data[i]}`)
        }
    }
}

enum dests {
    A,
    D,
    Aval
}

class Memory {
    private regA: number = 0
    private regD: number = 0

    private data: {[addr: number]: number} = {}

    public result(target: dests.A | dests.D | dests.Aval): number {
        if (target === dests.A) return this.regA
        if (target === dests.D) return this.regD

        // target is Aval
        if (this.data[this.regA] === undefined) {
            console.log(`Invalid read from memory at address ${this.regA} (Memory.result()). Initializing address with default value 0.`);

            this.data[this.regA] = 0;
        }
        
        return this.data[this.regA] ?? 0;
    }

    public update(value: number, Aflag: number = 1, Dflag: number = 0, Avalflag: number = 0) {
        if (Avalflag) {
            this.data[this.regA] = value
        }

        if (Aflag) this.regA = value
        if (Dflag) this.regD = value
    }

    public printMemValue(addr: number) {
        if (!(addr in this.data)) {
            console.log(`Memory address ${addr} uninitialized. Defaulting to 0.`)
            this.data[addr] = 0
        }
        console.log(`Memory[${addr}] = ${this.data[addr]}`)
    }

    public printMem() {
        for (let i in this.data) {
            console.log(`Memory Address ${i}: ${this.data[i]}`)
        }
    }
}

function getBit(n: number, d: number): number {
    return (n >>> d) & 1;
}

class ControlUnit {
    public mem: Memory = new Memory
    public prog: ROM
    private pc: number = 0

    public constructor (proginp?: number[]) {
        this.prog = new ROM(proginp)
    }

    private jump(addr: number, ltflag: number, eqflag: number, gtflag: number) {
        const gt = addr > 0
        const eq = addr === 0
        const lt = addr < 0

        const jmp = (gtflag && gt) || (eqflag && eq) || (ltflag && lt)

        if (jmp) this.pc = this.mem.result(dests.A)
        else this.pc ++
    }

    //ci  -  -  *  -  u op1 op0 zx sw a d *a lt eq gt
    //15 14 13 12 11 10   9   8  7  6 5 4  3  2  1  0

    public compute() {
        // Fetch instruction
        let instruction = this.prog.result(this.pc)

        // Make sure it's valid
        if (instruction < 0 || instruction > 0xFFFF) {
            console.log("Invalid instruction for control unit. No action performed.")
            return
        }

        // Work with A-instruction from bit 15
        if (!getBit(instruction, 15)) {
            // get number
            const value = instruction & 0x7FFF

            // Write to register A
            this.mem.update(value, 1, 0, 0);

            // Update program counter
            this.pc++
            return; //finish
        }
        else {
            // Determine ALU inputs
            let newA: number
            let newD = this.mem.result(dests.D)
            let x: number, y: number

            if (getBit(instruction, 12)) {
                newA = this.mem.result(dests.Aval) // use value at address A
            }
            else {
                newA = this.mem.result(dests.A); //use register A
            }

            if (getBit(instruction, 6)) { // swap x and y
                x = newD
                y = newA
            }
            else {
                x = newA
                y = newD
            }

            if (getBit(instruction, 7)) {
                x = 0
            }

            let op = 4*getBit(instruction, 10) + 2*getBit(instruction, 9) + getBit(instruction, 8)
            let result: number

            switch(op) { // ALU computation
                case 0: result = x & y; break;
                case 1: result = x | y; break;
                case 2: result = x ^ y; break;
                case 3: result = ~x; break;
                case 4: result = x + y; break;
                case 5: result = x + 1; break;
                case 6: result = x - y; break;
                case 7: result = x - 1; break;
                default: result = x;
            }

            // Update memory
            this.mem.update(result & 0xFFFF, getBit(instruction, 5), getBit(instruction, 4), getBit(instruction, 3));

            // Jump
            const ltFlag = getBit(instruction, 2);
            const eqFlag = getBit(instruction, 1);
            const gtFlag = getBit(instruction, 0);

            const isNegative = (result & 0x8000) !== 0;
            const isZero = (result & 0xFFFF) === 0;
            const isPositive = !isNegative && !isZero;

            const shouldJump = (ltFlag && isNegative) || (eqFlag && isZero) || (gtFlag && isPositive);

            if (shouldJump) {
                this.pc = this.mem.result(dests.A);
            }
            else {
                this.pc ++;
            }
        }
    }

    public run() {
        //This has the potential to run forever. You might want it to, but make sure you know how to interrupt the program.
        while (this.pc < this.prog.length) {
            this.compute()
        }
    }

    public printMemValue(addr: number) {
        this.mem.printMemValue(addr)
    }

    public printMem() {
        this.mem.printMem()
    }

    public status(): string {
        return `Printing Status:\n
        Program counter currently set to address ${this.pc.toString(16)},\n
        or line ${this.pc} out of ${this.prog.length + 1}.\n\n
        Register A = ${this.mem.result(dests.A).toString(16)}\n
        holding value ${this.mem.result(dests.Aval).toString(16)}\n
        and Register D = ${this.mem.result(dests.D).toString(16)}`
    }

    public printProgram() {
        this.prog.printProgram()
    }
}

let instructions = [ // numbering is starting at line 221
    0x0100, // A = 0100; start of stack initialization at rom 0
    0x8490, // D = A
    0x0000, // A = 0
    0x84c8, // *A = D
    0x0000, // A = 0; start of push.D
    0x94a0, // A = *A
    0x84c8, // *A = D
    0x8560, // A = A+1
    0x8490, // D = A
    0x0000, // A = 0
    0x84c8, // *A = D
    0x0000, // A = 0000; start of pop.D
    0x9750, // D = *A - 1
    0x84c8, // *A = D
    0x84e0, // A = D
    0x9490, // D = *A
]

let mycom = new ControlUnit(instructions)

mycom.run()

console.log(mycom.status())