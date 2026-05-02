/** Returns the element with the given ID or throws if missing or of unexpected type. */
export function requireElementById<T extends HTMLElement>(
  id: string,
  expectedType: new (...args: never[]) => T,
): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Element with ID "${id}" was not found.`);
  }
  if (!(element instanceof expectedType)) {
    throw new Error(
      `Element with ID "${id}" is not of expected type ${expectedType.name}.`,
    );
  }
  return element;
}
