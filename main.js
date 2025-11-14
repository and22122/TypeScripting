var ROM = /** @class */ (function () {
    function ROM(data) {
        this.data = data !== null && data !== void 0 ? data : [];
        this.length = this.data.length;
    }
    ROM.prototype.result = function (address) {
        if (this.data[address] !== undefined) {
            return this.data[address];
        }
        else {
            console.log("Invalid result from rom given address ".concat(address, "(ROM.result). Returning 0."));
            return 0;
        }
    };
    ROM.prototype.printProgram = function () {
        for (var i in this.data) {
            console.log("Address ".concat(i, ": ").concat(this.data[i]));
        }
    };
    return ROM;
}());
var dests;
(function (dests) {
    dests[dests["A"] = 0] = "A";
    dests[dests["D"] = 1] = "D";
    dests[dests["Aval"] = 2] = "Aval";
})(dests || (dests = {}));
var Memory = /** @class */ (function () {
    function Memory() {
        this.regA = 0;
        this.regD = 0;
        this.data = {};
    }
    Memory.prototype.result = function (target) {
        var _a;
        if (target === dests.A)
            return this.regA;
        if (target === dests.D)
            return this.regD;
        // target is Aval
        if (this.data[this.regA] === undefined) {
            console.log("Invalid read from memory at address ".concat(this.regA, " (Memory.result()). Initializing address with default value 0."));
            this.data[this.regA] = 0;
        }
        return (_a = this.data[this.regA]) !== null && _a !== void 0 ? _a : 0;
    };
    Memory.prototype.update = function (value, Aflag, Dflag, Avalflag) {
        if (Aflag === void 0) { Aflag = 1; }
        if (Dflag === void 0) { Dflag = 0; }
        if (Avalflag === void 0) { Avalflag = 0; }
        if (Avalflag) {
            this.data[this.regA] = value;
        }
        if (Aflag)
            this.regA = value;
        if (Dflag)
            this.regD = value;
    };
    Memory.prototype.printMemValue = function (addr) {
        if (!(addr in this.data)) {
            console.log("Memory address ".concat(addr, " uninitialized. Defaulting to 0."));
            this.data[addr] = 0;
        }
        console.log("Memory[".concat(addr, "] = ").concat(this.data[addr]));
    };
    Memory.prototype.printMem = function () {
        for (var i in this.data) {
            console.log("Memory Address ".concat(i, ": ").concat(this.data[i]));
        }
    };
    return Memory;
}());
function getBit(n, d) {
    return (n >>> d) & 1;
}
var ControlUnit = /** @class */ (function () {
    function ControlUnit(proginp) {
        this.mem = new Memory;
        this.pc = 0;
        this.prog = new ROM(proginp);
    }
    ControlUnit.prototype.jump = function (addr, ltflag, eqflag, gtflag) {
        var gt = addr > 0;
        var eq = addr === 0;
        var lt = addr < 0;
        var jmp = (gtflag && gt) || (eqflag && eq) || (ltflag && lt);
        if (jmp)
            this.pc = this.mem.result(dests.A);
        else
            this.pc++;
    };
    //ci  -  -  *  -  u op1 op0 zx sw a d *a lt eq gt
    //15 14 13 12 11 10   9   8  7  6 5 4  3  2  1  0
    ControlUnit.prototype.compute = function () {
        // Fetch instruction
        var instruction = this.prog.result(this.pc);
        // Make sure it's valid
        if (instruction < 0 || instruction > 0xFFFF) {
            console.log("Invalid instruction for control unit. No action performed.");
            return;
        }
        // Work with A-instruction from bit 15
        if (!getBit(instruction, 15)) {
            // get number
            var value = instruction & 0x7FFF;
            // Write to register A
            this.mem.update(value, 1, 0, 0);
            // Update program counter
            this.pc++;
            return; //finish
        }
        else {
            // Determine ALU inputs
            var newA = void 0;
            var newD = this.mem.result(dests.D);
            var x = void 0, y = void 0;
            if (getBit(instruction, 12)) {
                newA = this.mem.result(dests.Aval); // use value at address A
            }
            else {
                newA = this.mem.result(dests.A); //use register A
            }
            if (getBit(instruction, 6)) { // swap x and y
                x = newD;
                y = newA;
            }
            else {
                x = newA;
                y = newD;
            }
            if (getBit(instruction, 7)) {
                x = 0;
            }
            var op = 4 * getBit(instruction, 10) + 2 * getBit(instruction, 9) + getBit(instruction, 8);
            var result = void 0;
            switch (op) { // ALU computation
                case 0:
                    result = x & y;
                    break;
                case 1:
                    result = x | y;
                    break;
                case 2:
                    result = x ^ y;
                    break;
                case 3:
                    result = ~x;
                    break;
                case 4:
                    result = x + y;
                    break;
                case 5:
                    result = x + 1;
                    break;
                case 6:
                    result = x - y;
                    break;
                case 7:
                    result = x - 1;
                    break;
                default: result = x;
            }
            // Update memory
            this.mem.update(result & 0xFFFF, getBit(instruction, 5), getBit(instruction, 4), getBit(instruction, 3));
            // Jump
            var ltFlag = getBit(instruction, 2);
            var eqFlag = getBit(instruction, 1);
            var gtFlag = getBit(instruction, 0);
            var isNegative = (result & 0x8000) !== 0;
            var isZero = (result & 0xFFFF) === 0;
            var isPositive = !isNegative && !isZero;
            var shouldJump = (ltFlag && isNegative) || (eqFlag && isZero) || (gtFlag && isPositive);
            if (shouldJump) {
                this.pc = this.mem.result(dests.A);
            }
            else {
                this.pc++;
            }
        }
    };
    ControlUnit.prototype.run = function () {
        //This has the potential to run forever. You might want it to, but make sure you know how to interrupt the program.
        while (this.pc < this.prog.length) {
            this.compute();
        }
    };
    ControlUnit.prototype.printMemValue = function (addr) {
        this.mem.printMemValue(addr);
    };
    ControlUnit.prototype.printMem = function () {
        this.mem.printMem();
    };
    ControlUnit.prototype.status = function () {
        return "Printing Status:\n\n        Program counter currently set to address ".concat(this.pc.toString(16), ",\n\n        or line ").concat(this.pc, " out of ").concat(this.prog.length + 1, ".\n\n\n        Register A = ").concat(this.mem.result(dests.A).toString(16), "\n\n        holding value ").concat(this.mem.result(dests.Aval).toString(16), "\n\n        and Register D = ").concat(this.mem.result(dests.D).toString(16));
    };
    ControlUnit.prototype.printProgram = function () {
        this.prog.printProgram();
    };
    return ControlUnit;
}());
var instructions = [
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
];
var mycom = new ControlUnit(instructions);
mycom.run();
console.log(mycom.status());
