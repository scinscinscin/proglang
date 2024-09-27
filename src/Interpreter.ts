import { Token } from "./lexer";
import util from "util";
import { getInput } from "./stdlib/stdin";
import {
  ClassInstanceValue,
  Hashmapish,
  InternalClassValue,
  InternalMethodValue,
  NullValue,
  NumberValue,
  PackageValue,
  StringValue,
  Value,
} from "./Value";

export class Environment implements Hashmapish {
  parent?: Environment;
  underlying: Map<string, Value>;

  constructor(parent?: Environment) {
    this.parent = parent;
    this.underlying = new Map();
  }

  getValue(name: string): Value {
    return this.get(name);
  }

  get(name: string): Value {
    if (this.underlying.has(name)) return this.underlying.get(name)!;
    else if (this.parent) return this.parent.get(name);
    else throw new Error(`Undefined variable: ${name}`);
  }

  getAllKeys(): string[] {
    return [...this.underlying.keys(), ...(this.parent ? this.parent.getAllKeys() : [])] as string[];
  }

  setValue(name: string, value: Value) {
    this.underlying.set(name, value);
  }

  getKeys(): string[] {
    return [...this.underlying.keys(), ...(this.parent ? this.parent.getKeys() : [])] as string[];
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createStandardLibrary() {
  const environment = new Environment();

  const println = new InternalMethodValue<[StringValue]>(
    environment,
    [{ name: "value", type: { base: new Token(), dim: 0 } }],
    async (value) => {
      console.log(newLineify(value.value));
      return new NullValue();
    }
  );

  const print = new InternalMethodValue<[StringValue]>(
    environment,
    [{ name: "value", type: { base: new Token(), dim: 0 } }],
    async (value) => {
      process.stdout.write(newLineify(value.value));
      await delay(120);
      return new NullValue();
    }
  );

  const printf = new InternalMethodValue<[StringValue]>(
    environment,
    [{ name: "value", type: { base: new Token(), dim: 0 } }],
    async (format, ...values) => {
      const string = util.format(format.value, ...values.map((value) => (value as Value).toString()));
      process.stdout.write(newLineify(string));
      await delay(120);
      return new NullValue();
    },
    true // it has varargs
  );

  const System = new ClassInstanceValue(
    createMap({
      out: new ClassInstanceValue(createMap({ println, print, printf })),
      in: new ClassInstanceValue(new Map()),
    })
  );

  environment.setValue("System", System);

  const Scanner = new InternalClassValue(
    new Map(),
    createMap({
      nextLine: new InternalMethodValue(environment, [], async () => new StringValue(await getInput())),
      nextInt: new InternalMethodValue(environment, [], async () => new NumberValue(_parseInt(await getInput(), 10))),
      nextFloat: new InternalMethodValue(environment, [], async () => new NumberValue(_parseFloat(await getInput()))),
    })
  );

  const java = new PackageValue(createMap({ util: new PackageValue(createMap({ Scanner: Scanner })) }));
  environment.setValue("java", java);

  return environment;
}

const newLineify = (str: string) => str.replace(/\\n/g, "\n");

const _parseInt = (str: string, radix: number) => {
  let ret = parseInt(str, radix);
  return isNaN(ret) ? 0 : ret;
};

const _parseFloat = (str: string) => {
  let ret = parseFloat(str);
  return isNaN(ret) ? 0 : ret;
};

const createMap = <V>(object: { [key: string]: V }): Map<string, V> => new Map(Object.entries(object));

export class Interpreter {
  public environment: Environment;
  constructor(environment: Environment) {
    this.environment = environment;
  }
}
