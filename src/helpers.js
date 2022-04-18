import {
  TemplateInstance,
  createProcessor,
  NodeTemplatePart,
  processPropertyIdentity,
  processBooleanAttribute,
} from '@github/template-parts';

export function getBreakpoints(el, breakpoints) {
  return Object.keys(breakpoints)
    .filter((key) => {
      return el.offsetWidth >= breakpoints[key];
    })
    .join(' ');
}

function processPart(part, value) {
  processFunction(part, value) ||
    processBooleanAttribute(part, value) ||
    processDocumentFragment(part, value) ||
    processPropertyIdentity(part, value);
}

function processDocumentFragment(part, value) {
  if (value instanceof DocumentFragment && part instanceof NodeTemplatePart) {
    if (value.childNodes.length) part.replace(...value.childNodes);
    return true;
  }
  return false;
}

export function processFunction(part, value) {
  if (typeof value === 'function') {
    value(part);
    return true;
  }
  return false;
}

const processor = createProcessor(processPart);
const templates = {};
const renderedTemplates = new WeakMap();
const renderedTemplateInstances = new WeakMap();

export function render(element, htmlStr, values) {
  const templateEl = template(htmlStr);
  if (renderedTemplates.get(element) !== templateEl) {
    renderedTemplates.set(element, templateEl);
    const instance = new TemplateInstance(templateEl, values, processor);
    renderedTemplateInstances.set(element, instance);
    if (element instanceof NodeTemplatePart) {
      element.replace(...instance.children);
    } else {
      element.textContent = '';
      element.append(instance);
    }
    return;
  }
  renderedTemplateInstances.get(element).update(values);
}

export function template(htmlStr) {
  if (templates[htmlStr]) return templates[htmlStr];

  const templateEl = document.createElement('template');
  templateEl.innerHTML = htmlStr;
  templates[htmlStr] = templateEl;
  return templateEl;
}

export const unsafeHTML = (value) => (part) => {
  if (!(part instanceof NodeTemplatePart)) return;
  const template = document.createElement('template');
  template.innerHTML = value;
  const fragment = document.importNode(template.content, true);
  part.replace(...fragment.childNodes);
};
